import express from 'express';
import fs from 'fs/promises';
import { createOCREngine } from 'tesseract-wasm';
import { Image } from 'image-js';
import multer from 'multer';
import fetch from 'node-fetch';
import fsSync from 'fs';

const app = express();
const port = 3000;
const upload = multer();

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Logging middleware
app.use(async (req, res, next) => {
  const start = Date.now();
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    req.bodyRaw = Buffer.concat(chunks).toString();
  });
  const logEntry = {
    time: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    headers: req.headers,
    body: req.bodyRaw || '',
  };
  // Capture response
  const oldJson = res.json;
  res.json = function (data) {
    logEntry.response = data;
    logEntry.duration = Date.now() - start;
    fsSync.appendFileSync('log.txt', JSON.stringify(logEntry) + '\n');
    return oldJson.call(this, data);
  };
  next();
});

// FIFO queue for /ocr
const ocrQueue = [];
let ocrProcessing = false;
function processOcrQueue() {
  if (ocrProcessing || ocrQueue.length === 0) return;
  ocrProcessing = true;
  const { req, res } = ocrQueue.shift();
  handleOcr(req, res).finally(() => {
    ocrProcessing = false;
    processOcrQueue();
  });
}

app.post('/ocr', upload.array('images'), (req, res) => {
  ocrQueue.push({ req, res });
  processOcrQueue();
});

async function handleOcr(req, res) {
  try {
    const startAll = Date.now();
    // Accept files and/or URLs
    let files = req.files || [];
    let urls = [];
    if (req.body.urls) {
      try {
        urls = JSON.parse(req.body.urls);
      } catch {
        urls = Array.isArray(req.body.urls) ? req.body.urls : [req.body.urls];
      }
    }
    const results = [];
    // Load wasm + traineddata once
    const coreBinary = await fs.readFile('./tesseract-core.wasm');
    const modelBuffer = await fs.readFile('./tessdata/eng.traineddata');
    const engine = await createOCREngine({ wasmBinary: coreBinary });
    await engine.loadModel(modelBuffer);
    // Handle files
    for (const file of files) {
      const t0 = Date.now();
      const img = await Image.load(file.buffer);
      const rgba = img.rgba8();
      const imageData = {
        data: rgba.data,
        width: rgba.width,
        height: rgba.height,
      };
      await engine.loadImage(imageData);
      const text = (await engine.getText()).trim().split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      results.push({
        name: file.originalname,
        type: 'file',
        text,
        time: (Date.now() - t0) / 1000
      });
    }
    // Handle URLs
    for (const url of urls) {
      const t0 = Date.now();
      const resp = await fetch(url, {
        headers: {
          'Accept': 'image/avif,image/webp,image/png,image/*,*/*;q=0.8'
        }
      });
      if (!resp.ok) {
        results.push({ name: url, type: 'url', error: 'Failed to fetch image', time: 0 });
        continue;
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      try {
        const img = await Image.load(buf);
        const rgba = img.rgba8();
        const imageData = {
          data: rgba.data,
          width: rgba.width,
          height: rgba.height,
        };
        await engine.loadImage(imageData);
        const text = (await engine.getText()).trim().split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        results.push({
          name: url,
          type: 'url',
          text,
          time: (Date.now() - t0) / 1000
        });
      } catch (e) {
        results.push({ name: url, type: 'url', error: 'Invalid image', time: 0 });
      }
    }
    res.json({
      results,
      totalTime: (Date.now() - startAll) / 1000
    });
  } catch (err) {
    console.error('OCR Error:', err);
    res.status(500).json({ error: 'OCR failed!' });
  }
}

app.listen(port, () => {
  console.log(`OCR Server running: http://localhost:${port}`);
});
