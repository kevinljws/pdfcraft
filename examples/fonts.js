import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const fontDirectory = path.resolve(directory, "../fonts/Roboto");

export default {
	Roboto: {
		normal: path.join(fontDirectory, "Roboto-Regular.ttf"),
		bold: path.join(fontDirectory, "Roboto-Medium.ttf"),
		italics: path.join(fontDirectory, "Roboto-Italic.ttf"),
		bolditalics: path.join(fontDirectory, "Roboto-MediumItalic.ttf"),
	},
};
