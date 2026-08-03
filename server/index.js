require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5001;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL, // e.g. https://your-app.vercel.app
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DEVSPAXE API is running' });
});

function runCommand(command) {
  return new Promise((resolve) => {
    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      resolve({
        output: stdout || '',
        error: stderr || (error ? (error.killed ? 'Execution timed out' : error.message) : ''),
        exitCode: error ? (error.code || 1) : 0
      });
    });
  });
}

// Local code execution using native tools
app.post('/api/execute', async (req, res) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: 'Language and code are required' });
  }

  try {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notedev-'));
    let result;

    try {
      if (language === 'python') {
        const file = path.join(tmpDir, 'script.py');
        await fs.writeFile(file, code);
        // Try python3 first, fallback to python
        result = await runCommand(`python3 "${file}" || python "${file}"`);
      } else if (language === 'c++' || language === 'cpp') {
        const srcFile = path.join(tmpDir, 'main.cpp');
        const outFile = path.join(tmpDir, 'a.out');
        await fs.writeFile(srcFile, code);
        
        const compileResult = await runCommand(`g++ "${srcFile}" -o "${outFile}"`);
        if (compileResult.exitCode !== 0) {
          result = compileResult; // return compilation error
        } else {
          result = await runCommand(`"${outFile}"`);
        }
      } else {
        return res.status(400).json({ error: 'Language not supported by local execution engine' });
      }

      res.json({
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        language
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Execution error:', error.message);
    res.status(500).json({ error: 'Failed to execute code locally.' });
  }
});

app.listen(PORT, () => {
  console.log(`DEVSPAXE server running on port ${PORT}`);
});
