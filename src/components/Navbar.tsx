"use client";

import { ScanText, Github } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MobileMenu from "./MobileMenu";

const Navbar = () => {
	const pathname = usePathname();

	const navLinks = [
		{ href: "/", label: "Home" },
		{ href: "/about", label: "About" },
		{ href: "/docs", label: "API" },
	];

	return (
		<nav className="border-border glass sticky top-0 z-40 w-full border-b">
			<div className="container mx-auto flex h-16 items-center justify-between px-4">
				<Link href="/" className="group flex items-center gap-2">
					<div className="bg-brand rounded-lg p-1.5 transition-transform group-hover:rotate-12">
						<ScanText size={24} className="h-6 w-6 text-black" />
					</div>
					<span className="text-xl font-bold tracking-tight text-white">
						OCR<span className="text-brand">Express</span>
					</span>
				</Link>

				{/* Desktop Menu */}
				<div className="hidden items-center gap-8 text-sm font-medium text-zinc-400 md:flex">
					{navLinks.map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								className={`transition-colors ${
									isActive ? "text-brand font-semibold" : "hover:text-brand text-zinc-400"
								}`}
							>
								{link.label}
							</Link>
						);
					})}
					<Link
						href="https://github.com/s488u/ocr-express"
						target="_blank"
						className="flex items-center gap-1 hover:text-white"
					>
						<Github size={24} className="h-4 w-4" />Github
					</Link>
				</div>

				{/* Mobile Menu Button */}
				<MobileMenu />
			</div>
		</nav>
	);
};

export default Navbar;
