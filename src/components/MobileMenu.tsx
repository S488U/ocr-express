"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const MobileMenu = () => {
	const [open, setOpen] = useState(false);

	return (
		<div className="md:hidden">
			<button
				className="text-zinc-300 transform-content hover:text-white md:hidden"
				onClick={() => setOpen(!open)}
			>
				{!open ? <Menu size={24} className="h-7 w-7" /> : <X size={24} className="h-7 w-7" />}
			</button>

			{/* Mobile Menu Dropdown */}
			{open && (
				<div className="border-border bg-card fixed top-16 right-0 left-0 z-50 border-t">
					<div className="flex flex-col gap-4 p-4 text-zinc-400">
						<Link href="/" className="text-brand font-medium" onClick={() => setOpen(false)}>
							Home
						</Link>
						<Link href="/about" className="hover:text-brand" onClick={() => setOpen(false)}>
							About
						</Link>
						<Link href="/docs" className="hover:text-brand" onClick={() => setOpen(false)}>
							API Docs
						</Link>
						<Link
							href="https://github.com/s488u/ocr-express"
							className="hover:text-brand"
							onClick={() => setOpen(false)}
						>
							GitHub
						</Link>
					</div>
				</div>
			)}
		</div>
	);
};

export default MobileMenu;
