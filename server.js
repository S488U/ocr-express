import express from 'express';
import { promises as fs } from 'fs'; // Use promise-based fs
import { createOCREngine } from 'tesseract-wasm';
import { Image } from 'image-js';
import multer from 'multer';
import fetch from 'node-fetch';

const app = express();
const port = 3000;

const upload = multer({ 
  limits: { fileSize: 5 * 1024 * 1024 } 
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// --- GLOBAL OCR ENGINE ---
// We initialize this ONCE.
let ocrEngine = null;

async function initOCREngine() {
  if (ocrEngine) return ocrEngine;
  console.log('Initializing OCR Engine...');
  try {
    const coreBinary = await fs.readFile('./tesseract-core.wasm');
    const modelBuffer = await fs.readFile('./tessdata/eng.traineddata');
    const engine = await createOCREngine({ wasmBinary: coreBinary });
    await engine.loadModel(modelBuffer);
    console.log('OCR Engine ready.');
    ocrEngine = engine;
    return engine;
  } catch (err) {
    console.error('Failed to init OCR engine:', err);
    process.exit(1);
  }
}

// Start the engine immediately
initOCREngine();

// --- LOGGING ---
app.use(async (req, res, next) => {
  const start = Date.now();
  // Don't buffer the whole body for logging in production, it eats RAM.
  // Just capture metadata.
  
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - start;
    const logEntry = {
      time: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      duration: `${duration}ms`
    };
    // Async append (Non-blocking)
    fs.appendFile('log.txt', JSON.stringify(logEntry) + '\n').catch(console.error);
    return originalJson.call(this, data);
  };
  next();
});

// --- QUEUE SYSTEM ---
// Tesseract WASM is synchronous on the main thread in this context. 
// We must queue requests to ensure we don't try to use the single engine instance concurrently.
const ocrQueue = [];
let ocrProcessing = false;

function processOcrQueue() {
  if (ocrProcessing || ocrQueue.length === 0) return;
  ocrProcessing = true;
  const { req, res } = ocrQueue.shift();
  
  // Give the event loop a tick to breathe before starting heavy CPU work
  setImmediate(() => {
    handleOcr(req, res).finally(() => {
      ocrProcessing = false;
      processOcrQueue();
    });
  });
}

app.post('/ocr', upload.array('images'), (req, res) => {
  ocrQueue.push({ req, res });
  processOcrQueue();
});

async function handleOcr(req, res) {
  try {
    const startAll = Date.now();
    // Re-use the global engine
    if (!ocrEngine) await initOCREngine();

    let files = req.files || [];
    let urls = [];
    
    // Safer parsing
    if (req.body.urls) {
      try {
        const parsed = JSON.parse(req.body.urls);
        urls = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // invalid JSON in urls, ignore or handle
      }
    }

    const results = [];

    // Helper to run OCR on an image buffer
    const processBuffer = async (buffer, name, type) => {
      try {
        const t0 = Date.now();
        const img = await Image.load(buffer);
        const rgba = img.rgba8();
        const imageData = {
          data: rgba.data,
          width: rgba.width,
          height: rgba.height,
        };
        
        // Load image into engine
        ocrEngine.loadImage(imageData);
        
        // Get text
        const rawText = ocrEngine.getText();
        const text = rawText.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        
        results.push({
          name: name,
          type: type,
          text,
          time: (Date.now() - t0) / 1000
        });
      } catch (err) {
        console.error(`Error processing ${name}:`, err);
        results.push({ name: name, type: type, error: 'Processing failed', time: 0 });
      }
    };

    // 1. Process Uploaded Files
    for (const file of files) {
      await processBuffer(file.buffer, file.originalname, 'file');
    }

    // 2. Process URLs
    for (const url of urls) {
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(5000) }); // 5s timeout
        if (!resp.ok) throw new Error('Fetch failed');
        const buf = Buffer.from(await resp.arrayBuffer());
        await processBuffer(buf, url, 'url');
      } catch (e) {
        results.push({ name: url, type: 'url', error: 'Invalid URL or Image', time: 0 });
      }
    }

    res.json({
      results,
      totalTime: (Date.now() - startAll) / 1000
    });

  } catch (err) {
    console.error('OCR Critical Error:', err);
    res.status(500).json({ error: 'OCR service failed internally.' });
  }
}

app.listen(port, () => {
  console.log(`OCR Server running: http://localhost:${port}`);
});