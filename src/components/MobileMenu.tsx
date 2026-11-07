"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const MobileMenu = () => {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	const navLinks = [
		{ href: "/", label: "Home" },
		{ href: "/about", label: "About" },
		{ href: "/docs", label: "API Docs" },
	];

	return (
		<div className="md:hidden">
			<button
				aria-label={open ? "Close menu" : "Open menu"}
				className="text-zinc-300 transform-content hover:text-white md:hidden"
				onClick={() => setOpen(!open)}
			>
				{!open ? <Menu size={24} className="h-7 w-7" /> : <X size={24} className="h-7 w-7" />}
			</button>

			{/* Mobile Menu Dropdown */}
			{open && (
				<>
					<div
						className="fixed inset-0 top-16 z-40 bg-black/60 backdrop-blur-xs"
						onClick={() => setOpen(false)}
					/>
					<div className="border-border bg-card/95 fixed top-16 right-0 left-0 z-50 border-t backdrop-blur-md">
						<div className="flex flex-col gap-4 p-4 text-zinc-400">
							{navLinks.map((link) => {
								const isActive = pathname === link.href;
								return (
									<Link
										key={link.href}
										href={link.href}
										className={`transition-colors ${
											isActive ? "text-brand font-semibold" : "hover:text-brand text-zinc-300"
										}`}
										onClick={() => setOpen(false)}
									>
										{link.label}
									</Link>
								);
							})}
							<Link
								href="https://github.com/s488u/ocr-express"
								target="_blank"
								className="hover:text-brand text-zinc-300"
								onClick={() => setOpen(false)}
							>
								GitHub
							</Link>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default MobileMenu;
