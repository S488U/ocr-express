import { CheckCircle, Cpu, ShieldCheck } from "lucide-react";
import Card from "@/src/components/Card";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "About - OCR Express",
	description:
		"OCR Express is a practical OCR service focused on speed, predictable behavior, and a clean developer experience. It accepts uploaded images or remote image URLs, runs OCR using tesseract-wasm in a Node.js runtime, and returns structured per-item results with processing time.",
};

const About = () => {
	const stack = [
		"Next.js App Router (Node.js runtime for OCR route)",
		"tesseract-wasm (WASM OCR engine)",
		"TypeScript",
		"Tailwind CSS",
		"image-js (decode and RGBA preprocessing)",
	];

	const CardData = [
		{
			icon: Cpu,
			color: "blue",
			title: "WASM OCR Engine",
			description:
				"The OCR route uses a single shared Tesseract WASM engine instance to avoid repeated initialization and keep request latency stable.",
		},
		{
			icon: ShieldCheck,
			color: "green",
			title: "Predictable Processing",
			description:
				"Requests are queued and processed sequentially, so concurrent traffic does not corrupt OCR state. Inputs are handled in-memory and not persisted as stored uploads.",
		},
	] as const;

	return (
		<main className="container mx-auto max-w-3xl grow px-4 py-16">
			<h1 className="text-brand mb-8 text-4xl font-bold">About the Project</h1>

			<div className="space-y-12">
				<section className="prose prose-invert">
					<p className="text-lg leading-relaxed text-zinc-300">
						OCR Express is a practical OCR service focused on speed, predictable behavior, and a clean
						developer experience. It accepts uploaded images or remote image URLs, runs OCR using
						<strong> tesseract-wasm </strong>
						in a Node.js runtime, and returns structured per-item results with processing time.
					</p>
				</section>

				<div className="grid gap-6 md:grid-cols-2">
					{CardData.map((item, index) => (
						<Card
							key={index}
							Icon={item.icon}
							iconBgCol={item.color}
							iconTextCol={item.color}
							title={item.title}
							description={item.description}
						/>
					))}
				</div>

				<section>
					<h2 className="mb-4 text-2xl font-bold text-white">The Stack</h2>
					<ul className="space-y-3 text-zinc-400">
						{stack.map((item, index) => (
							<li key={index} className="flex items-center gap-3">
								<CheckCircle size={24} className="text-brand h-5 w-5" />
								{item}
							</li>
						))}
					</ul>
				</section>

				<section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
					<h2 className="mb-3 text-xl font-bold text-white">Operational Notes</h2>
					<ul className="space-y-2 text-sm text-zinc-300">
						<li>Each OCR result includes either `text` or an item-level `error`.</li>
						<li>URL image fetches are time-limited to prevent long blocking requests.</li>
						<li>A queue-based execution model protects engine stability under concurrent traffic.</li>
					</ul>
				</section>
			</div>
		</main>
	);
};

export default About;
