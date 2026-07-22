import pdfmake from "../dist/index.mjs"; // during development; use 'pdfmake' when installed
import Roboto from "./fonts.js";
pdfmake.addFonts(Roboto);

// or you can define the font manually:
/*
pdfmake.addFonts({
	Roboto: {
		normal: '../fonts/Roboto/Roboto-Regular.ttf',
		bold: '../fonts/Roboto/Roboto-Medium.ttf',
		italics: '../fonts/Roboto/Roboto-Italic.ttf',
		bolditalics: '../fonts/Roboto/Roboto-MediumItalic.ttf'
	}
});
*/

pdfmake.setUrlAccessPolicy((url) => {
	// this can be used to restrict allowed domains
	return url.startsWith("https://");
});

pdfmake.setLocalAccessPolicy((path) => {
	// this can be used to restrict access to local file system
	return true;
});

var docDefinition = {
	content: [
		"First paragraph",
		"Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines",
	],
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write("pdfs/basics.pdf").then(
	() => {
		console.log(new Date() - now);
	},
	(err) => {
		console.error(err);
	},
);
