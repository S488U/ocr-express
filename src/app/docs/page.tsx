import highlight from "@/src/lib/shiki";
import { Server } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "API Documentation | OCR Express",
	description:
		"Official OCR Express API reference for /api/ocr with multipart request formats, response schemas, error behavior, and monitoring endpoint details.",
};

const Docs = async () => {
	const successResponse = `{
  "results": [
    {
      "name": "invoice.png",
      "type": "file",
      "text": ["Invoice #1021", "Total: $120.00"],
      "time": 0.38
    },
    {
      "name": "https://example.com/receipt.jpg",
      "type": "url",
      "text": ["Store Name", "Amount 54.20"],
      "time": 0.41
    }
  ],
  "totalTime": 0.91
}`;

	const partialFailureResponse = `{
  "results": [
    {
      "name": "broken-image.jpg",
      "type": "file",
      "error": "Processing failed",
      "time": 0
    },
    {
      "name": "https://bad-domain.test/a.png",
      "type": "url",
      "error": "Invalid URL or Image",
      "time": 0
    }
  ],
  "totalTime": 0.12
}`;

	const healthResponse = `{
  "status": "ok",
  "queueLength": 0,
  "processing": false
}`;

	const curlFiles = `curl -X POST http://localhost:3000/api/ocr \\
  -F "images=@screenshot.png" \\
  -F "images=@document.jpg"`;

	const curlUrls = `curl -X POST http://localhost:3000/api/ocr \\
  -F 'urls=["https://example.com/a.png","https://example.com/b.jpg"]'`;

	const curlMixed = `curl -X POST http://localhost:3000/api/ocr \\
  -F "images=@scan.png" \\
  -F 'urls=["https://example.com/remote.jpg"]'`;

	const highlightedCurlFiles = await highlight(curlFiles, "bash");
	const highlightedCurlUrls = await highlight(curlUrls, "bash");
	const highlightedCurlMixed = await highlight(curlMixed, "bash");
	const highlightedSuccess = await highlight(successResponse, "json");
	const highlightedFailure = await highlight(partialFailureResponse, "json");
	const highlightedHealth = await highlight(healthResponse, "json");

	const parameters = [
		{
			param: "images",
			type: "file[]",
			required: "No",
			description: "One or more multipart image files. Field name must be exactly `images`.",
		},
		{
			param: "urls",
			type: "string (JSON)",
			required: "No",
			description:
				"JSON array string of remote image URLs, for example: `[\"https://site/a.png\"]`. Field name must be `urls`.",
		},
	];

	return (
		<main className="container mx-auto max-w-4xl grow px-4 py-16">
			<div className="mb-6 flex items-center gap-4">
				<div className="rounded-xl bg-zinc-800 p-3">
					<Server size={24} className="text-brand h-8 w-8" />
				</div>
				<div>
					<h1 className="text-3xl font-bold">API Documentation</h1>
					<p className="mt-1 text-sm text-zinc-400">
						Reference for OCR request formats, response contracts, failure modes, and service health.
					</p>
				</div>
			</div>

			<div className="space-y-10">
				{/* Endpoint */}
				<section className="bg-card border-border overflow-hidden rounded-2xl border">
					<div className="border-border flex items-center justify-between border-b bg-zinc-900/50 p-4">
						<div className="flex items-center gap-3">
							<span className="rounded bg-blue-500/20 px-3 py-1 text-sm font-bold text-blue-400">
								POST
							</span>
							<code className="text-zinc-300">/api/ocr</code>
						</div>
						<span className="text-xs text-zinc-500">Multipart/Form-Data</span>
					</div>
					<div className="p-6">
						<p className="mb-4 text-zinc-400">
							Runs OCR on uploaded image files and/or remote image URLs. Returns one result item per
							input in processing order.
						</p>
						<h3 className="mb-2 text-sm font-bold tracking-wider text-white uppercase">Parameters</h3>
						<ul className="mb-6 space-y-2 text-sm text-zinc-400">
							{parameters.map((item, index) => (
								<li key={index} className="grid grid-cols-1 gap-2 border-b border-zinc-800 pb-2 sm:grid-cols-3">
									<span className="text-brand font-mono">{item.param.trim()}</span>
									<span className="col-span-2">
										<span className="mr-2 font-mono text-zinc-300">{item.type}</span>
										<span className="mr-2 text-zinc-500">required: {item.required}</span>
										<span>{item.description.trim()}</span>
									</span>
								</li>
							))}
						</ul>

						<div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-300">
							<p className="mb-2 font-semibold text-white">Behavior Notes</p>
							<ul className="list-disc space-y-1 pl-5">
								<li>At least one input is expected (`images` or `urls`).</li>
								<li>Each URL fetch has a timeout of approximately 5 seconds.</li>
								<li>
									On per-item failure, API still returns `200` with an item-level `error` message.
								</li>
								<li>
									Only unexpected server failures return `500` with:
									<code className="ml-1 rounded bg-zinc-900 px-1 py-0.5">
										{`{ "error": "OCR Server Failed Internally." }`}
									</code>
								</li>
							</ul>
						</div>

						<h3 className="mb-2 text-sm font-bold tracking-wider text-white uppercase">
							Example Request (Files)
						</h3>
						<div className="mb-4 overflow-hidden rounded-lg" dangerouslySetInnerHTML={{ __html: highlightedCurlFiles }} />

						<h3 className="mb-2 text-sm font-bold tracking-wider text-white uppercase">
							Example Request (URLs)
						</h3>
						<div className="mb-4 overflow-hidden rounded-lg" dangerouslySetInnerHTML={{ __html: highlightedCurlUrls }} />

						<h3 className="mb-2 text-sm font-bold tracking-wider text-white uppercase">
							Example Request (Mixed)
						</h3>
						<div className="mb-6 overflow-hidden rounded-lg" dangerouslySetInnerHTML={{ __html: highlightedCurlMixed }} />

						<h3 className="mb-2 text-sm font-bold tracking-wider text-white uppercase">
							Example Response (Success)
						</h3>
						<div className="mb-4 overflow-hidden rounded-lg" dangerouslySetInnerHTML={{ __html: highlightedSuccess }} />

						<h3 className="mb-2 text-sm font-bold tracking-wider text-white uppercase">
							Example Response (Partial Failure)
						</h3>
						<div className="mb-4 overflow-hidden rounded-lg" dangerouslySetInnerHTML={{ __html: highlightedFailure }} />
					</div>
				</section>

				<section className="bg-card border-border overflow-hidden rounded-2xl border">
					<div className="border-border flex items-center justify-between border-b bg-zinc-900/50 p-4">
						<div className="flex items-center gap-3">
							<span className="rounded bg-green-500/20 px-3 py-1 text-sm font-bold text-green-400">
								GET
							</span>
							<code className="text-zinc-300">/api/ocr</code>
						</div>
						<span className="text-xs text-zinc-500">Application/JSON</span>
					</div>
					<div className="p-6">
						<p className="mb-4 text-zinc-400">
							Returns lightweight server state for monitoring queue load and processing activity.
						</p>
						<h3 className="mb-2 text-sm font-bold tracking-wider text-white uppercase">
							Example Response
						</h3>
						<div className="overflow-hidden rounded-lg" dangerouslySetInnerHTML={{ __html: highlightedHealth }} />
					</div>
				</section>
			</div>
		</main>
	);
};

export default Docs;
