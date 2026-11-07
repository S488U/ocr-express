"use client";

import { Link, UploadCloud, Zap, Eye, X, Loader2, Copy, File, Check } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import Image from "next/image";
import PreviewModal from "./PreviewModal";
import type { ComponentProps } from "react";

type imageItems = {
	file: File;
	url: string;
};

type previewItem = {
	src: string;
	alt: string;
};

type resultItem = {
	name: string;
	text: string[];
	type: "file" | "url";
	time: number;
	imageUrl: string;
	imageIndex: number;
};

type resultType = {
	results: resultItem[];
	totalTime: number;
};

const ToolContainer = () => {
	const [images, setImages] = useState<imageItems[]>([]);
	const [openImage, setOpenImage] = useState(false);
	const [imageIndex, setImageIndex] = useState(0);
	const [previewItems, setPreviewItems] = useState<previewItem[]>([]);
	const [urls, setUrls] = useState<string[]>([]);
	const [urlInputValue, setUrlInputValue] = useState("");
	const [urlError, setUrlError] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>("");
	const [showThumbnails, setShowThumbnails] = useState(false);
	const [result, setResult] = useState<resultType>({
		results: [],
		totalTime: 0,
	});
	const [copied, setCopied] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const urlInputRef = useRef<HTMLInputElement | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);

	const isValidUrl = (str: string) => {
		try {
			const parsed = new URL(str);
			return parsed.protocol === "http:" || parsed.protocol === "https:";
		} catch {
			return false;
		}
	};

	const addUrlsFromText = (rawText: string) => {
		const items = rawText
			.split(/[\n,\s]+/)
			.map((item) => item.trim())
			.filter((item) => item.length > 0);

		if (items.length === 0) return;

		const validUrls: string[] = [];
		let hasInvalid = false;

		items.forEach((item) => {
			if (isValidUrl(item)) {
				if (!urls.includes(item) && !validUrls.includes(item)) {
					validUrls.push(item);
				}
			} else {
				hasInvalid = true;
			}
		});

		if (validUrls.length > 0) {
			setUrls((prev) => [...prev, ...validUrls]);
			setUrlInputValue("");
		}

		if (hasInvalid) {
			setUrlError("Some URLs were invalid. Please provide valid http:// or https:// URLs.");
		} else {
			setUrlError("");
		}
	};

	const removeUrl = (indexToRemove: number) => {
		setUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
	};

	const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			if (urlInputValue.trim()) {
				addUrlsFromText(urlInputValue);
			}
		} else if (e.key === "Backspace" && urlInputValue === "" && urls.length > 0) {
			removeUrl(urls.length - 1);
		}
	};

	const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		const text = e.clipboardData.getData("text");
		if (text && (text.includes("\n") || text.includes(",") || text.includes(" ") || isValidUrl(text.trim()))) {
			e.preventDefault();
			addUrlsFromText(text);
		}
	};

	const handleUrlBlur = () => {
		if (urlInputValue.trim()) {
			addUrlsFromText(urlInputValue);
		}
	};

	const openFileDialogueWindow = () => {
		fileInputRef.current?.click();
	};

	const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files) return;

		const newFiles = Array.from(e.target.files);

		const updatedImage = newFiles.map((file) => ({
			file,
			url: URL.createObjectURL(file),
		}));

		if (result.results.length > 0) {
			images.forEach((item) => URL.revokeObjectURL(item.url));

			setImages(updatedImage);

			setResult({
				results: [],
				totalTime: 0,
			});
		} else {
			setImages((prev) => [...prev, ...updatedImage]);
		}
		setShowThumbnails(true);
	};

	const removeFile = (index: number) => {
		setImages((prev) => {
			const updated = [...prev];
			URL.revokeObjectURL(updated[index].url);
			updated.splice(index, 1);
			return updated;
		});
	};

	const openModal = (items: previewItem[], index: number) => {
		if (index < 0 || !items[index]?.src) return;
		setImageIndex(index);
		setPreviewItems(items);
		setOpenImage(true);
	};

	const submitForm: NonNullable<ComponentProps<"form">["onSubmit"]> = async (e) => {
		e.preventDefault();
		setLoading(true);

		try {
			const formData = new FormData();

			images.forEach((image) => formData.append("images", image.file));

			const finalUrls = [...urls];
			if (urlInputValue.trim()) {
				const trimmed = urlInputValue.trim();
				if (isValidUrl(trimmed) && !finalUrls.includes(trimmed)) {
					finalUrls.push(trimmed);
				}
			}

			if (finalUrls.length > 0) {
				formData.append("urls", JSON.stringify(finalUrls));
			}

			const response = await fetch("/api/ocr", {
				method: "POST",
				body: formData,
			});

			const data = await response.json();
			let fileCursor = 0;
			const mergedResult = data.results.map((item: resultItem) => {
				if (item.type === "url") {
					return {
						...item,
						imageUrl: item.name,
						imageIndex: -1,
					};
				}

				const currentFileIndex = fileCursor;
				fileCursor += 1;

				return {
					...item,
					imageUrl: images[currentFileIndex]?.url || "",
					imageIndex: currentFileIndex,
				};
			});

			setResult({
				results: mergedResult,
				totalTime: data.totalTime,
			});

			console.log(data);
		} catch (err) {
			console.error("Error sending request", err);
			setError(err instanceof Error ? "An unknown error occured" : "");
		} finally {
			setLoading(false);
			setShowThumbnails(false);
		}
	};

	const copyContent = async (text: string[]) => {
		try {
			const textData = text.join("\n");
			await navigator.clipboard.writeText(textData);
			setCopied(true);

			setTimeout(() => {
				setCopied(false);
			}, 2000);
		} catch (err) {
			console.error("Copied Error: ", err);
		}
	};

	useEffect(() => {
		console.log("Index " + imageIndex);
		console.table(result.results);
		if (scrollRef.current) {
			scrollRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [imageIndex, result.results]);

	const getUploadedPreviewItems = (): previewItem[] => {
		return images.map((item) => ({
			src: item.url,
			alt: item.file.name,
		}));
	};

	const getResultPreviewItems = (): previewItem[] => {
		return result.results.map((item) => ({
			src: item.imageUrl || "",
			alt: item.name || "Preview Image",
		}));
	};

	return (
		<>
			<div className="glass relative overflow-hidden rounded-2xl p-4 shadow-2xl sm:rounded-3xl sm:p-8">
				<form className="space-y-4 sm:space-y-6" onSubmit={submitForm}>
					{/* Upload Area */}
					<div
						onClick={openFileDialogueWindow}
						className="group hover:border-brand/50 relative cursor-pointer rounded-xl border-2 border-dashed border-zinc-700 p-6 text-center transition-all hover:bg-zinc-900/50 sm:rounded-2xl sm:p-12"
					>
						<input
							ref={fileInputRef}
							onChange={handleFiles}
							type="file"
							accept="image/*"
							multiple
							className="hidden"
						/>
						<div className="flex flex-col items-center gap-3 sm:gap-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 shadow-lg transition-transform group-hover:scale-110 sm:h-16 sm:w-16">
								<UploadCloud
									size={24}
									className="group-hover:text-brand h-6 w-6 text-zinc-400 sm:h-8 sm:w-8"
								/>
							</div>
							<div className="select-none">
								<p className="text-base font-semibold text-zinc-200 sm:text-lg">
									Drop images or click to browse
								</p>
								<p className="mt-1 text-xs text-zinc-500 sm:text-sm">Supports PNG, JPG, WebP</p>
							</div>

							<button
								type="button"
								className="hover:bg-brand mt-1 rounded-full bg-zinc-100 px-4 py-2 text-xs font-bold text-black shadow-md transition-colors sm:mt-2 sm:px-6 sm:text-sm"
							>
								Select Files
							</button>
						</div>
					</div>

					{/* Thumbnails Grid */}
					{images.length > 0 && showThumbnails === true ? (
						<div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6">
							{/* Thumbnails injected here via JS */}
							{images.map((item, index) => (
								<div
									key={index}
									className="group hover:border-brand relative aspect-square overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 shadow-sm transition-all duration-300 ease-in-out hover:scale-105"
								>
									<Image
										src={item.url}
										width={200}
										height={200}
										alt={item.file.name}
										className="h-full w-full cursor-pointer object-cover opacity-90 transition-opacity group-hover:opacity-100"
										onClick={() => openModal(getUploadedPreviewItems(), index)}
									/>

									{/* Delete Button (Top Right) */}
									<button
										type="button"
										className="absolute top-1 right-1 z-10 rounded-md bg-black/60 p-1 text-white backdrop-blur-sm transition-colors hover:bg-red-500"
										onClick={() => removeFile(index)}
									>
										<X className="h-4 w-4" />
									</button>

									{/* Expand Hint (Center - optional visual cue) */}
									<div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
										<div className="rounded-full bg-black/50 p-2 backdrop-blur-sm">
											<Eye className="h-5 w-5 text-white" />
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						""
					)}

					{/* URL Input & Run Button */}
					<div className="flex flex-col gap-3 sm:flex-row">
						<div className="relative grow flex-col">
							<div
								onClick={() => urlInputRef.current?.focus()}
								className="border-border focus-within:ring-brand/50 focus-within:border-brand flex min-h-12 w-full cursor-text flex-wrap items-center gap-1.5 rounded-xl border bg-zinc-900/50 p-2 transition-all focus-within:ring-2"
							>
								<div className="flex shrink-0 items-center px-1 text-zinc-500">
									<Link size={18} />
								</div>

								{urls.map((url, idx) => (
									<span
										key={idx}
										className="border-zinc-700 bg-zinc-800 text-zinc-200 inline-flex max-w-[280px] items-center gap-1 rounded-lg border px-2.5 py-1 text-xs sm:max-w-[360px]"
									>
										<span className="truncate font-mono" title={url}>
											{url.replace(/^https?:\/\//, "")}
										</span>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												removeUrl(idx);
											}}
											className="hover:bg-zinc-700 hover:text-white ml-0.5 rounded p-0.5 text-zinc-400 transition-colors"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								))}

								<input
									ref={urlInputRef}
									type="text"
									placeholder={
										urls.length === 0
											? "Paste image URL and press Enter (optional)"
											: "Add another URL..."
									}
									className="min-w-[160px] grow bg-transparent px-1 py-1 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
									value={urlInputValue}
									onChange={(e) => {
										setUrlInputValue(e.target.value);
										if (urlError) setUrlError("");
									}}
									onKeyDown={handleUrlKeyDown}
									onPaste={handleUrlPaste}
									onBlur={handleUrlBlur}
								/>
							</div>

							<div className="mt-1 flex items-center justify-between px-2 text-xs text-zinc-500">
								<span>Press Enter or comma to add multiple URLs, or paste directly</span>
								{urlError && <span className="font-medium text-red-400">{urlError}</span>}
							</div>
						</div>

						<button
							type="submit"
							disabled={loading || (images.length === 0 && urls.length === 0 && urlInputValue.trim() === "")}
							className={`bg-brand flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-8 text-lg font-bold text-black shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all hover:brightness-110 active:scale-[0.98] sm:w-auto ${images.length === 0 && urls.length === 0 && urlInputValue.trim() === "" ? "cursor-not-allowed opacity-50" : ""}`}
						>
							{!loading ? (
								<>
									<Zap size={24} className="h-5 w-5 fill-current" />
									<span>Run OCR</span>
								</>
							) : (
								<>
									<span className="mr-2 animate-spin">
										<Loader2 className="h-5 w-5" />
									</span>
									<span>Processing...</span>
								</>
							)}
						</button>
					</div>
				</form>

				{/* Error Display */}
				{error !== "" && <div className="mt-6 animate-pulse text-center font-medium text-red-400">{error}</div>}

				{/* Results Stack */}
				{result.results.length !== 0 &&
					result.results.map((item, index) => (
						<div ref={scrollRef} key={index} className="mt-8 space-y-4 sm:mt-12 sm:space-y-6">
							<div className="glass border-l-brand animate-[slideIn_0.4s_ease-out] space-y-3 rounded-xl border-l-4 p-3 sm:space-y-4 sm:rounded-2xl sm:p-5">
								<div className="border-border flex items-center justify-between border-b pb-2 sm:pb-3">
									<div className="flex items-center gap-2 overflow-hidden sm:gap-3">
										{/* <div className="shrink-0 rounded-lg bg-zinc-800 p-1.5 sm:p-2">
											{item?.type === "file" ? (
												<File className="text-brand h-4 w-4 sm:h-5 sm:w-5" />
											) : (
												<Link className="text-brand h-4 w-4 sm:h-5 sm:w-5" />
											)}
										</div> */}
										{/* copied content */}
										<div
											className="group/thumb relative shrink-0 cursor-pointer"
											onClick={() => openModal(getResultPreviewItems(), index)}
										>
											{item.type === "url" ? (
												<img
													alt=""
													src={item.imageUrl || ""}
													className="group-hover/thumb:border-brand h-10 w-10 rounded-lg border border-zinc-700 bg-zinc-800 object-cover transition-colors sm:h-12 sm:w-12"
												/>
											) : (
												<Image
													width={200}
													height={200}
													alt=""
													src={item.imageUrl || ""}
													className="group-hover/thumb:border-brand h-10 w-10 rounded-lg border border-zinc-700 bg-zinc-800 object-cover transition-colors sm:h-12 sm:w-12"
												/>
											)}
											<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover/thumb:bg-black/20">
												<i
													data-lucide="maximize-2"
													className="h-4 w-4 text-white opacity-0 drop-shadow-md transition-opacity group-hover/thumb:opacity-100"
												></i>
											</div>
										</div>

										<div className="flex min-w-0 flex-col">
											<span
												className="truncate text-sm font-bold text-zinc-200"
												title="${result.name}"
											>
												{item?.name || "Hello world"}
											</span>
											<span className="font-mono text-[10px] text-zinc-500 sm:text-xs">
												Processed in {(item?.time || 0).toFixed(2)}s
											</span>
										</div>
									</div>
								</div>
								<div className="group relative">
									<pre className="border-border scrollbar-thin overflow-x-auto rounded-xl border bg-zinc-950 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-zinc-300 sm:p-4 sm:text-sm">
										{Array.isArray(item.text) && item.text.length !== 0 ? (
											item.text.join("\n")
										) : (
											<span className="text-red-300">No Text detected</span>
										)}
									</pre>
									<button
										onClick={() => copyContent(item.text)}
										className={`copy-btn ${copied ? "bg-green-400" : "bg-brand"} absolute top-2 right-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-black opacity-100 shadow-lg transition-opacity sm:top-3 sm:right-3 sm:px-3 sm:py-1.5 sm:text-xs sm:opacity-0 sm:group-hover:opacity-100`}
									>
										{copied ? (
											<>
												<Check className="h-3 w-3" /> Copied
											</>
										) : (
											<>
												<Copy className="h-3 w-3" /> Copy
											</>
										)}
									</button>
								</div>
							</div>
						</div>
					))}
			</div>
			{openImage && (
				<PreviewModal
					openImage={openImage}
					setOpenImage={setOpenImage}
					items={previewItems}
					index={imageIndex}
				/>
			)}
		</>
	);
};

export default ToolContainer;
