const bgColMap = {
	blue: "bg-blue-500/20",
	red: "bg-red-500/20",
	green: "bg-green-500/20",
	purple: "bg-purple-500/20",
} as const;

const textColMap = {
	blue: "text-blue-400",
	red: "text-red-400",
	green: "text-green-400",
	purple: "text-purple-400",
} as const;

type colorKey = keyof typeof bgColMap;

type CardProps = {
	Icon: React.ElementType;
	iconBgCol?: colorKey;
	iconTextCol?: colorKey;
	title: string;
	description: string;
};

const Card = ({ Icon, iconBgCol = "blue", iconTextCol = "blue", title, description }: CardProps) => {
	const refinedBgCol = bgColMap[iconBgCol];
	const refinedTextCol = textColMap[iconTextCol];

	return (
		<div className="bg-card border-border rounded-2xl border p-6">
			<div
				className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${refinedBgCol} ${refinedTextCol}`}
			>
				<Icon size={24} className="h-5 w-5" />
			</div>
			<h3 className="mb-2 text-xl font-bold text-white">{title.trim()}</h3>
			<p className="text-sm text-zinc-400">{description.trim()}</p>
		</div>
	);
};

export default Card;
