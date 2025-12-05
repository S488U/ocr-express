import express from 'express';
import { promises as fs } from 'fs';
import { createOCREngine } from 'tesseract-wasm';
import { Image } from 'image-js';
import multer from 'multer';
import fetch from 'node-fetch';
import path from 'path';

const app = express();

// --- VERCEL SPECIFIC CONFIG ---
// 1. Disable Vercel's default body parser so Multer can handle the stream
export const config = {
  api: {
    bodyParser: false,
  },
};

// 2. Reduce limit to 4MB because Vercel has a hard 4.5MB limit
const upload = multer({ 
  limits: { fileSize: 4 * 1024 * 1024 } 
});

// Helper to resolve paths in Serverless environment
const resolvePath = (p) => path.join(process.cwd(), p);

// --- GLOBAL OCR ENGINE ---
let ocrEngine = null;

async function initOCREngine() {
  if (ocrEngine) return ocrEngine;
  console.log('Initializing OCR Engine (Cold Start)...');
  try {
    // USE resolvePath HERE
    const coreBinary = await fs.readFile(resolvePath('tesseract-core.wasm'));
    const modelBuffer = await fs.readFile(resolvePath('tessdata/eng.traineddata'));
    
    const engine = await createOCREngine({ wasmBinary: coreBinary });
    await engine.loadModel(modelBuffer);
    
    console.log('OCR Engine ready.');
    ocrEngine = engine;
    return engine;
  } catch (err) {
    console.error('Failed to init OCR engine:', err);
    throw err;
  }
}

// --- ROUTES ---

// Health check
app.get('/api/health', (req, res) => res.send('OCR Service is Alive'));

app.post('/ocr', upload.array('images'), async (req, res) => {
  try {
    const startAll = Date.now();
    
    // Initialize engine inside request (Cold start handling)
    if (!ocrEngine) await initOCREngine();

    let files = req.files || [];
    let urls = [];
    
    // Multer handles the body parsing, but if we have other fields:
    if (req.body && req.body.urls) {
       try {
        const parsed = JSON.parse(req.body.urls);
        urls = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) { /* ignore */ }
    }

    const results = [];

    // Processing Logic (Identical to your VPS logic)
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
        ocrEngine.loadImage(imageData);
        const rawText = ocrEngine.getText();
        const text = rawText.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        results.push({ name, type, text, time: (Date.now() - t0) / 1000 });
      } catch (err) {
        console.error(`Error processing ${name}:`, err);
        results.push({ name, type, error: 'Processing failed', time: 0 });
      }
    };

    // 1. Files
    for (const file of files) {
      await processBuffer(file.buffer, file.originalname, 'file');
    }

    // 2. URLs
    for (const url of urls) {
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!resp.ok) throw new Error('Fetch failed');
        const buf = Buffer.from(await resp.arrayBuffer());
        await processBuffer(buf, url, 'url');
      } catch (e) {
        results.push({ name: url, type: 'url', error: 'Invalid URL', time: 0 });
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
});

// Serve static files (Vercel handles public folder automatically, but this helps local dev)
app.use(express.static('public'));

// VERCEL EXPORT
// We export the app, we DO NOT listen
export default app;