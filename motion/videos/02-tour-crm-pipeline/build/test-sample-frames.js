const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const PORT = 8878;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9334;
const USER_DATA_DIR = path.join(PROJECT_DIR, 'build', 'chrome-profile-test');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/src/peca.html';
  
  let filePath = path.join(PROJECT_DIR, reqPath);
  if (!fs.existsSync(filePath)) {
    const altPath = path.join(PROJECT_DIR, '..', '..', reqPath);
    if (fs.existsSync(altPath)) filePath = altPath;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

async function main() {
  server.listen(PORT, '127.0.0.1');

  if (!fs.existsSync(USER_DATA_DIR)) fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    `--user-data-dir=${USER_DATA_DIR}`,
    'about:blank'
  ], { stdio: 'ignore' });

  let versionData = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const targets = await listRes.json();
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const wsUrl = pageTarget.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  let idCounter = 1;
  const pendingRequests = new Map();

  function sendCDP(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise(r => ws.onopen = r);
  await sendCDP('Page.enable');
  await sendCDP('Runtime.enable');

  await sendCDP('Emulation.setDeviceMetricsOverride', {
    width: 1080,
    height: 1920,
    deviceScaleFactor: 1,
    mobile: false
  });

  await sendCDP('Page.navigate', { url: `http://127.0.0.1:${PORT}/src/peca.html` });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    const res = await sendCDP('Runtime.evaluate', {
      expression: 'Boolean(window.__ready)'
    });
    if (res.result && res.result.value === true) {
      ready = true;
      break;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('Generating test samples...');
  const timestamps = [
    { t: 4.0, name: 'amostra_cena1.jpg' },
    { t: 10.0, name: 'amostra_cena1_dinamica.jpg' },
    { t: 20.0, name: 'amostra_cena2.jpg' },
    { t: 36.0, name: 'amostra_cena3.jpg' },
    { t: 50.0, name: 'amostra_cena4.jpg' },
    { t: 65.0, name: 'amostra_cena5.jpg' }
  ];

  for (const item of timestamps) {
    const script = `
      (async () => {
        await prepareFrame(${item.t});
        render(${item.t});
        return cv.toDataURL('image/jpeg', 0.95);
      })()
    `;
    const res = await sendCDP('Runtime.evaluate', { expression: script, awaitPromise: true, returnByValue: true });
    if (res.result && res.result.value) {
      const b64 = res.result.value.replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(path.join(PROJECT_DIR, 'build', item.name), Buffer.from(b64, 'base64'));
      console.log(`Saved ${item.name}`);
    }
  }

  // Cover
  const coverRes = await sendCDP('Runtime.evaluate', { expression: 'renderCover(0)' });
  if (coverRes.result && coverRes.result.value) {
    const b64 = coverRes.result.value.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(PROJECT_DIR, 'build', 'capa-crm.png'), Buffer.from(b64, 'base64'));
    console.log('Saved capa-crm.png');
  }

  ws.close();
  chromeProcess.kill();
  server.close();
  console.log('Done test samples!');
}

main().catch(console.error);
