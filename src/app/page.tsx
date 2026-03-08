import ToolContainer from "@/src//components/ToolContainer";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "OCR Express | Instant Image-to-Text",
	description:
		"Extract text from screenshots, documents, and photos using OCR Express. Send local images or URLs and get clean OCR output with per-image timing.",
};

const Home = () => {
	return (
		<div className="text-brand min-h-screen">
			<main className="container mx-auto max-w-5xl grow px-4 py-12">
				{/* Hero */}
				<div className="mb-10 text-center">
					<h1 className="mb-4 bg-linear-to-b from-white to-zinc-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
						Extract text from images
					</h1>
					<p className="mx-auto max-w-xl text-lg text-zinc-400">
						Secure, private, and high-performance OCR powered by WebAssembly.
					</p>
				</div>

				<ToolContainer />
			</main>
		</div>
	);
};

export default Home;
