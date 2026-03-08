import Link from "next/link";

const Footer = () => {
	const currentDate = new Date().getFullYear();

	return (
		<footer className="border-border mt-auto border-t bg-zinc-950 py-8">
			<div className="container mx-auto px-4 text-center">
				<p className="mb-2 text-sm text-zinc-500">© {currentDate} OCR Express. All rights reserved.</p>
				<p className="text-sm text-zinc-600">
					Frontend Designed by 
					{" "}
					<Link href="https://en.wikipedia.org/wiki/Google_Gemini" target="_blank" className="underline hover:text-gray-500">
						 Gemini AI
					</Link>
				</p>
			</div>
		</footer>
	);
};

export default Footer;
