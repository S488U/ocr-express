import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";

type previewItem = {
	src: string;
	alt: string;
};

type PreviewTypes = {
	items: previewItem[];
	index: number;
	openImage: boolean;
	setOpenImage: React.Dispatch<React.SetStateAction<boolean>>;
};

const PreviewModal = ({ items, index, openImage, setOpenImage }: PreviewTypes) => {
	const [count, setCount] = useState(index);

	const imageLength = items.length;
	const modalIndex = items[count];

	const goNext = () => {
		setCount((prev) => (prev < imageLength - 1 ? prev + 1 : 0));
	};

	const goPrev = () => {
		setCount((prev) => (prev > 0 ? prev - 1 : imageLength - 1));
	};

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "ArrowRight") {
				setCount((prev) => (prev < imageLength - 1 ? prev + 1 : 0));
			} else if (event.key == "ArrowLeft") {
				setCount((prev) => (prev > 0 ? prev - 1 : imageLength - 1));
			} else if (event.key == "Escape") {
				setOpenImage(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [imageLength, setOpenImage]);

	if (!openImage || !modalIndex) return null;

	return (
		<div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md`}>
			<button
				className="absolute top-4 right-4 z-50 cursor-pointer rounded-full bg-zinc-800 p-2 text-white transition-colors hover:bg-red-500"
				onClick={() => setOpenImage(false)}
			>
				<X className="h-6 w-6" />
			</button>

			<button
				onClick={goPrev}
				className={`hover:bg-brand absolute left-4 z-50 hidden cursor-pointer rounded-full bg-zinc-800/50 p-3 text-white transition-colors hover:text-black md:block ${imageLength <= 1 ? "pointer-events-none opacity-0" : ""}`}
			>
				<ChevronLeft className="h-8 w-8" />
			</button>

			<img
				src={modalIndex.src || ""}
				alt={modalIndex.alt || "Preview Image"}
				className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
			/>

			<button
				onClick={goNext}
				className={`hover:bg-brand absolute right-4 z-50 hidden cursor-pointer rounded-full bg-zinc-800/50 p-3 text-white transition-colors hover:text-black md:block ${imageLength <= 1 ? "pointer-events-none opacity-0" : ""}`}
			>
				<ChevronRight className="h-8 w-8" />
			</button>

			{/* Mobile Controls Bottom  */}
			<div
				onClick={goPrev}
				className={`absolute bottom-6 flex gap-6 md:hidden ${imageLength <= 1 ? "pointer-events-none opacity-0" : ""}`}
			>
				<button className="cursor-pointer rounded-full bg-zinc-800 p-3 text-white">
					<ChevronLeft className="h-8 w-8" />
				</button>
				<button onClick={goNext} className="cursor-pointer rounded-full bg-zinc-800 p-3 text-white">
					<ChevronRight className="h-8 w-8" />
				</button>
			</div>
		</div>
	);
};

export default PreviewModal;
