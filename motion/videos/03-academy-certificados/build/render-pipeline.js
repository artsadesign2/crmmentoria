const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const SRC_HTML_PATH = path.join(PROJECT_DIR, 'src', 'peca.html');
const FRAMES_DIR = path.join(PROJECT_DIR, 'build', 'frames');
const OUTPUT_DIR = path.join(PROJECT_DIR, 'output');
const AUDIO_PATH = path.join(PROJECT_DIR, 'audio', 'voz_alinhada.wav');
const COVER_OUTPUT = path.join(OUTPUT_DIR, 'ScaleMentors-Academy-Capa.png');
const VIDEO_OUTPUT = path.join(OUTPUT_DIR, 'ScaleMentors-Academy-Tour.mp4');

// Ensure directories
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const PORT = 8880;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9336;
const USER_DATA_DIR = path.join(PROJECT_DIR, 'build', 'chrome-profile');

// 1. HTTP Server for serving video project files
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
  console.log(`[1/5] Local server started on http://127.0.0.1:${PORT}`);

  // Launch Chrome
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

  console.log('[2/5] Chrome headless launched. Connecting via CDP...');

  // Wait for debug endpoint
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

  if (!versionData) {
    throw new Error('Could not connect to Chrome DevTools port');
  }

  // Create or get page target
  const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const targets = await listRes.json();
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const wsUrl = pageTarget.webSocketDebuggerUrl;

  console.log('[3/5] Connected to Page target:', wsUrl);

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

  // Enable Page & Runtime
  await sendCDP('Page.enable');
  await sendCDP('Runtime.enable');
  await sendCDP('Log.enable').catch(() => {});

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('Browser console:', ...msg.params.args.map(a => a.value || a.description));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('Browser Exception:', msg.params.exceptionDetails);
    }
  });

  await sendCDP('Emulation.setDeviceMetricsOverride', {
    width: 1080,
    height: 1920,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Navigate to peca.html
  console.log(`[4/5] Navigating to http://127.0.0.1:${PORT}/src/peca.html...`);
  await sendCDP('Page.navigate', { url: `http://127.0.0.1:${PORT}/src/peca.html` });

  // Wait for window.__ready
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

  if (!ready) {
    throw new Error('peca.html failed to become ready within 18 seconds');
  }

  console.log('✔ peca.html is fully loaded and initialized!');

  // Render cover image
  console.log('Generating Cover Image...');
  const coverRes = await sendCDP('Runtime.evaluate', {
    expression: 'renderCover(0)'
  });
  if (coverRes.result && coverRes.result.value) {
    const base64Data = coverRes.result.value.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(COVER_OUTPUT, Buffer.from(base64Data, 'base64'));
    fs.writeFileSync(path.join(PROJECT_DIR, 'build', 'capa-academy.png'), Buffer.from(base64Data, 'base64'));
    console.log(`✔ Cover saved to ${COVER_OUTPUT}`);
  }

  // Get metadata (DUR, FPS, W, H)
  const metaRes = await sendCDP('Runtime.evaluate', {
    expression: 'JSON.stringify({ dur: DUR, fps: FPS, w: W, h: H, title: CFG.titulo })'
  });
  const meta = JSON.parse(metaRes.result.value);
  const totalFrames = Math.ceil(meta.dur * meta.fps);
  console.log(`Starting frame render: ${totalFrames} frames (${meta.dur}s @ ${meta.fps}fps, ${meta.w}x${meta.h})`);

  fs.writeFileSync(path.join(PROJECT_DIR, 'build', 'meta.json'), JSON.stringify({
    fps: meta.fps,
    dur: meta.dur,
    w: meta.w,
    h: meta.h,
    quadros: totalFrames,
    arquivo: "scalementors-academy-certificacao"
  }, null, 2));

  // Batch rendering of frames
  const BATCH_SIZE = 15;
  const startTime = Date.now();

  for (let f = 0; f < totalFrames; f += BATCH_SIZE) {
    const startF = f;
    const endF = Math.min(f + BATCH_SIZE, totalFrames);

    const batchScript = `
      (async () => {
        const frames = [];
        for (let i = ${startF}; i < ${endF}; i++) {
          const t = i / ${meta.fps};
          await prepareFrame(t);
          render(t);
          frames.push(cv.toDataURL('image/jpeg', 0.93));
        }
        return frames;
      })()
    `;

    const batchRes = await sendCDP('Runtime.evaluate', {
      expression: batchScript,
      awaitPromise: true,
      returnByValue: true
    });

    if (batchRes.result && batchRes.result.value) {
      const frameList = batchRes.result.value;
      for (let idx = 0; idx < frameList.length; idx++) {
        const frameIdx = startF + idx;
        const b64 = frameList[idx].replace(/^data:image\/jpeg;base64,/, '');
        const filename = String(frameIdx).padStart(6, '0') + '.jpg';
        fs.writeFileSync(path.join(FRAMES_DIR, filename), Buffer.from(b64, 'base64'));
      }
    }

    const pct = ((endF / totalFrames) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const fpsSpeed = (endF / (elapsed || 0.1)).toFixed(1);
    process.stdout.write(`\r[Rendering Frames] ${endF}/${totalFrames} (${pct}%) - ${fpsSpeed} fps - ${elapsed}s elapsed`);
  }

  console.log('\n✔ All frames rendered to disk!');

  // Close Chrome and WS
  ws.close();
  chromeProcess.kill();
  server.close();

  // 5. Run FFmpeg to compile video
  console.log('[5/5] Compiling final MP4 with FFmpeg...');
  const ffmpegCmd = `ffmpeg -y -framerate ${meta.fps} -i "${path.join(FRAMES_DIR, '%06d.jpg')}" -i "${AUDIO_PATH}" -c:v libx264 -pix_fmt yuv420p -crf 17 -preset medium -c:a aac -b:a 192k -shortest "${VIDEO_OUTPUT}"`;

  console.log('Running:', ffmpegCmd);
  execSync(ffmpegCmd, { stdio: 'inherit' });

  console.log(`\n🎉 SUCCESS! Final Video generated at:`);
  console.log(`📁 Video: ${VIDEO_OUTPUT}`);
  console.log(`🖼 Capa: ${COVER_OUTPUT}`);
}

main().catch(err => {
  console.error('Render error:', err);
  server.close();
  process.exit(1);
});
