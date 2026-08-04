const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export async function executeCode(language, code) {
  const lang = language.toLowerCase();

  // JavaScript runs in-browser via sandboxed iframe — no backend needed
  if (lang === 'javascript' || lang === 'js') {
    return executeJavaScript(code);
  }

  // HTML/CSS runs in iframe preview (handled separately by CodeBlock component)
  if (lang === 'html' || lang === 'css') {
    return { output: '', error: 'HTML/CSS uses preview mode.' };
  }

  try {
    const response = await fetch(`${API_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang, code }),
    });

    const result = await response.json();

    // Surface specific server-side error codes to the user
    if (response.status === 429) {
      return {
        output: '',
        error: result.error || 'Rate limit reached — please wait a moment before running again.',
      };
    }
    if (response.status === 503) {
      return {
        output: '',
        error: result.error || 'The server is busy — please try again in a few seconds.',
      };
    }
    if (!response.ok) {
      return {
        output: '',
        error: result.error || `Server returned an error (${response.status}).`,
      };
    }

    return {
      output: result.output || '',
      error: result.error || '',
      exitCode: result.exitCode,
    };
  } catch (err) {
    // Network-level failures (server down, CORS, DNS)
    return {
      output: '',
      error: `Could not reach the execution server. Is the backend running?\n(${err.message})`,
    };
  }
}

function executeJavaScript(code) {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts';
    document.body.appendChild(iframe);

    let output = [];
    let error = '';

    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      document.body.removeChild(iframe);
      resolve({ output: output.join('\n'), error: 'Execution timed out (5s limit)' });
    }, 5000);

    const handler = (event) => {
      if (event.source !== iframe.contentWindow) return;
      const msg = event.data;
      if (msg.type === 'console') {
        output.push(msg.args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      } else if (msg.type === 'error') {
        error = msg.message;
      } else if (msg.type === 'done') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        document.body.removeChild(iframe);
        resolve({ output: output.join('\n'), error });
      }
    };

    window.addEventListener('message', handler);

    const html = `<!DOCTYPE html><html><body><script>
      console.log = (...args) => parent.postMessage({ type: 'console', args }, '*');
      console.warn = (...args) => parent.postMessage({ type: 'console', args: ['[warn]', ...args] }, '*');
      console.error = (...args) => parent.postMessage({ type: 'console', args: ['[error]', ...args] }, '*');
      try {
        ${code}
      } catch(e) {
        parent.postMessage({ type: 'error', message: e.toString() }, '*');
      }
      parent.postMessage({ type: 'done' }, '*');
    <\/script></body></html>`;

    iframe.srcdoc = html;
  });
}
