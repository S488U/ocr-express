import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { decode } from "image-js";
// @ts-expect-error tesseract-wasm package exports currently break TS "bundler" type resolution.
import { createOCREngine, type OCREngine } from "tesseract-wasm";

export const runtime = "nodejs";

type OcrResult =
	| {
			name: string;
			type: "file" | "url";
			text: string[];
			time: number;
	  }
	| {
			name: string;
			type: "file" | "url";
			error: string;
			time: number;
	  };

let ocrEngine: OCREngine | null = null;
let ocrEngineInit: Promise<OCREngine> | null = null;
const ocrLogger = (m: unknown) => console.log(m);

async function readFirst(paths: string[]): Promise<Uint8Array> {
	for (const p of paths) {
		try {
			return await fs.readFile(p);
		} catch {}
	}
	throw new Error(`Could not read any of: ${paths.join(", ")}`);
}

// --- GLOBAL OCR ENGINE ---
// Initialize once and reuse.
async function initOCREngine(): Promise<OCREngine> {
	if (ocrEngine) return ocrEngine;
	if (ocrEngineInit) return ocrEngineInit;

	ocrEngineInit = (async () => {
		ocrLogger({ status: "initializing engine" });

		const coreBinary = await readFirst([
			path.join(process.cwd(), "tesseract-core.wasm"),
			path.join(process.cwd(), "node_modules", "tesseract-wasm", "dist", "tesseract-core.wasm"),
		]);
		const modelBuffer = await readFirst([
			path.join(process.cwd(), "tessdata", "eng.traineddata"),
			path.join(process.cwd(), "public", "tessdata", "eng.traineddata"),
		]);

		const engine = await createOCREngine({ wasmBinary: coreBinary });
		engine.loadModel(modelBuffer);

		ocrLogger({ status: "engine ready" });
		ocrEngine = engine;
		return engine;
	})();

	try {
		return await ocrEngineInit;
	} finally {
		ocrEngineInit = null;
	}
}

// --- QUEUE SYSTEM ---
// Tesseract WASM is synchronous on the main thread in this context.
// We must queue requests to ensure we don't try to use the single engine instance concurrently.
const ocrQueue: Array<() => Promise<void>> = [];
let ocrProcessing = false;

async function processQueue() {
	if (ocrProcessing) return;
	ocrProcessing = true;

	try {
		while (ocrQueue.length > 0) {
			const job = ocrQueue.shift();
			if (!job) continue;
			await job();
		}
	} finally {
		ocrProcessing = false;
	}
}

async function handleOcr(req: NextRequest): Promise<Response> {
	const startAll = Date.now();

	try {
		const engine = await initOCREngine();

		const formData = await req.formData();
		const files = formData.getAll("images").filter((item): item is File => item instanceof File);
		const urlsRaw = formData.get("urls");

		let urls: string[] = [];
		if (urlsRaw) {
			try {
				const parsed = JSON.parse(urlsRaw.toString());
				const parsedUrls = Array.isArray(parsed) ? parsed : [parsed];
				urls = parsedUrls.filter((u): u is string => typeof u === "string").map((u) => u.trim());
			} catch {}
		}

		const results: OcrResult[] = [];
		const processBuffer = async (buffer: Buffer, name: string, type: "file" | "url") => {
			const t0 = Date.now();
			ocrLogger({ status: "recognizing text", progress: 0, name, type });

			try {
				const img = decode(buffer);
				const rgba = img.convertColor("RGBA");
				const raw = rgba.getRawImage();
				const data =
					raw.data instanceof Uint8ClampedArray
						? raw.data
						: new Uint8ClampedArray(raw.data.buffer, raw.data.byteOffset, raw.data.byteLength);

				engine.loadImage({
					data,
					width: raw.width,
					height: raw.height,
				} as ImageData);

				const rawText = String(engine.getText());
				const text = rawText
					.trim()
					.split(/\r?\n/)
					.map((line: string) => line.trim())
					.filter((line: string) => line.length > 0);

				results.push({
					name,
					type,
					text,
					time: (Date.now() - t0) / 1000,
				});
				ocrLogger({ status: "recognition complete", progress: 1, name, type });
			} catch {
				results.push({
					name,
					type,
					error: "Processing failed",
					time: 0,
				});
				ocrLogger({ status: "recognition failed", progress: 1, name, type });
			}
		};

		// Process uploaded files.
		for (const file of files) {
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			await processBuffer(buffer, file.name, "file");
		}

		// Process URLs.
		for (const url of urls) {
			try {
				const resp = await fetch(url, {
					signal: AbortSignal.timeout(5000),
				});
				if (!resp.ok) throw new Error(`Fetch failed with status ${resp.status}`);
				const buf = Buffer.from(await resp.arrayBuffer());
				await processBuffer(buf, url, "url");
			} catch {
				results.push({
					name: url,
					type: "url",
					error: "Invalid URL or Image",
					time: 0,
				});
			}
		}

		return NextResponse.json({
			results,
			totalTime: (Date.now() - startAll) / 1000,
		});
	} catch (err) {
		console.error("OCR Critical Error: ", err);

		return NextResponse.json(
			{
				error: "OCR Server Failed Internally.",
			},
			{ status: 500 }
		);
	}
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    queueLength: ocrQueue.length,
    processing: ocrProcessing,
  });
}


// Main POST Request Handler
export async function POST(req: NextRequest): Promise<Response> {
	return new Promise<Response>((resolve) => {
		ocrQueue.push(async () => {
			resolve(await handleOcr(req));
		});

		void processQueue();
	});
}
