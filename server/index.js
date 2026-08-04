require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Startup validation ───────────────────────────────────────────────────────
if (!process.env.FRONTEND_URL) {
  console.warn(
    '[WARN] FRONTEND_URL environment variable is not set. ' +
    'CORS will only allow localhost origins. Set this to your Vercel URL in production.'
  );
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server health checks from Render/UptimeRobot)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '256kb' })); // Hard limit on request body size

// ─── Rate Limiter (for /api/execute only) ─────────────────────────────────────
const executeLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 10,                   // Max 10 execution requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit reached — you can run up to 10 code blocks per minute. Please wait a moment.',
    code: 'RATE_LIMITED',
  },
});

// ─── Execution Queue ──────────────────────────────────────────────────────────
const MAX_CONCURRENT = 3;      // Max simultaneous code executions
const QUEUE_TIMEOUT_MS = 30000; // Max time a job waits in queue (30s)
let activeJobs = 0;
const waitQueue = [];

/**
 * Acquire a slot in the execution pool. Returns a Promise that resolves
 * when a slot is available, or rejects if the queue wait exceeds QUEUE_TIMEOUT_MS.
 */
function acquireSlot() {
  if (activeJobs < MAX_CONCURRENT) {
    activeJobs++;
    return Promise.resolve();
  }

  // Queue the request
  return new Promise((resolve, reject) => {
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      const idx = waitQueue.indexOf(tryResolve);
      if (idx !== -1) waitQueue.splice(idx, 1);
      reject(new Error('QUEUE_TIMEOUT'));
    }, QUEUE_TIMEOUT_MS);

    function tryResolve() {
      if (timedOut) return;
      clearTimeout(timer);
      activeJobs++;
      resolve();
    }

    waitQueue.push(tryResolve);
  });
}

/** Release a slot and wake the next waiter in queue. */
function releaseSlot() {
  activeJobs--;
  if (waitQueue.length > 0) {
    const next = waitQueue.shift();
    next();
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_CODE_LENGTH = 50_000;  // 50k characters max
const EXEC_TIMEOUT_MS = 8_000;   // 8 second execution timeout per job

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Run a binary with args, safely via execFile (no shell interpolation).
 * Returns { output, error, exitCode }.
 */
function runBinary(bin, args, options = {}) {
  return new Promise((resolve) => {
    execFile(bin, args, { timeout: EXEC_TIMEOUT_MS, ...options }, (error, stdout, stderr) => {
      resolve({
        output: stdout || '',
        error: stderr || (error ? (error.killed ? 'Execution timed out (8s limit)' : error.message) : ''),
        exitCode: error ? (error.code || 1) : 0,
      });
    });
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'DEVSPAXE API is running',
    queue: { active: activeJobs, waiting: waitQueue.length, maxConcurrent: MAX_CONCURRENT },
  });
});

app.post('/api/execute', executeLimiter, async (req, res) => {
  const { language, code } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'A valid language is required.' });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required.' });
  }
  if (code.length > MAX_CODE_LENGTH) {
    return res.status(400).json({
      error: `Code exceeds the maximum allowed length of ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
    });
  }

  const lang = language.toLowerCase().trim();
  const SUPPORTED = ['python', 'c++', 'cpp', 'java'];
  if (!SUPPORTED.includes(lang)) {
    return res.status(400).json({ error: `Language '${lang}' is not supported by the execution engine.` });
  }

  // ── Acquire queue slot ────────────────────────────────────────────────────
  try {
    await acquireSlot();
  } catch (e) {
    return res.status(503).json({
      error: 'The server is currently busy with too many execution requests. Please try again in a moment.',
      code: 'SERVER_BUSY',
    });
  }

  // ── Execute ───────────────────────────────────────────────────────────────
  let tmpDir;
  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devspaxe-'));
    let result;

    if (lang === 'python') {
      const file = path.join(tmpDir, 'script.py');
      await fs.writeFile(file, code, 'utf8');
      result = await runBinary('python3', [file]);

    } else if (lang === 'c++' || lang === 'cpp') {
      const srcFile = path.join(tmpDir, 'main.cpp');
      const outFile = path.join(tmpDir, 'program');
      await fs.writeFile(srcFile, code, 'utf8');

      const compileResult = await runBinary('g++', [srcFile, '-o', outFile, '-std=c++17']);
      if (compileResult.exitCode !== 0) {
        result = compileResult; // return compilation error
      } else {
        result = await runBinary(outFile, []);
      }

    } else if (lang === 'java') {
      const file = path.join(tmpDir, 'Main.java');
      await fs.writeFile(file, code, 'utf8');
      // Java 11+ single-file source execution — no separate compile step needed
      result = await runBinary('java', [file]);
    }

    res.json({
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      language: lang,
    });

  } catch (err) {
    console.error('[execute] Unexpected error:', err.message);
    res.status(500).json({ error: 'An unexpected server error occurred during execution.' });
  } finally {
    releaseSlot();
    if (tmpDir) {
      fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {}); // non-blocking cleanup
    }
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`DEVSPAXE server running on port ${PORT}`);
  console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`Execution queue: max ${MAX_CONCURRENT} concurrent jobs, ${QUEUE_TIMEOUT_MS / 1000}s timeout`);
});
