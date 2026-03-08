import { codeToHtml } from "shiki";

//  to highlight code in docs section
const hightlight = async (code: string, lang: string) => {
	return await codeToHtml(code, {
		lang,
		theme: "github-dark",
	});
};

export default hightlight;
