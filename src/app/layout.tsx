import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/src/components/Navbar";
import Footer from "@/src/components/Footer";

const inter = Inter({
	subsets: ["latin"],
	display: "swap",
});

const siteUrl = "https://ocr-express.vercel.app";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: "OCR Express | Instant Image-to-Text",
		template: "%s | OCR Express",
	},
	description:
		"OCR Express extracts text from images with a fast WASM OCR engine. Upload files or submit image URLs and get structured results in seconds.",
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title: "OCR Express | Instant Image-to-Text",
		description:
			"OCR Express extracts text from images with a fast WASM OCR engine. Upload files or submit image URLs and get structured results in seconds.",
		url: "/",
		siteName: "OCR Express",
		type: "website",
		images: [
			{
				url: "/og-image.jpg",
				width: 1200,
				height: 630,
				alt: "OCR Express API and image-to-text interface preview",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "OCR Express | Instant Image-to-Text",
		description:
			"OCR Express extracts text from images with a fast WASM OCR engine. Upload files or submit image URLs and get structured results in seconds.",
		images: ["/twitter-image.png"],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${inter.className} antialiased`}>
				<Navbar />
				{children}
				<Footer />
			</body>
		</html>
	);
}
