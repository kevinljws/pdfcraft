import pdfmake from "pdfcraft/browser";
import boldFont from "../../../fonts/Roboto/Roboto-Medium.ttf?url";
import boldItalicsFont from "../../../fonts/Roboto/Roboto-MediumItalic.ttf?url";
import italicsFont from "../../../fonts/Roboto/Roboto-Italic.ttf?url";
import normalFont from "../../../fonts/Roboto/Roboto-Regular.ttf?url";
import testXml from "../../shared/samples/test.xml?raw";
import { parseDocumentDefinition } from "../../shared/editor";

const resolveAsset = (asset) => new URL(asset, window.location.href).href;

pdfmake.addFonts({
	Roboto: {
		normal: resolveAsset(normalFont),
		bold: resolveAsset(boldFont),
		italics: resolveAsset(italicsFont),
		bolditalics: resolveAsset(boldItalicsFont),
	},
});

pdfmake.addVirtualFileSystem({
	"./test.xml": { data: testXml, encoding: "utf8" },
});

export const generatePdf = (source) => {
	const documentDefinition = parseDocumentDefinition(source);
	return pdfmake.createPdf(documentDefinition).getBlob();
};
