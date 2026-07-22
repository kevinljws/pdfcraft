import pdfmake from "../dist/index.mjs"; // during development; use 'pdfmake' when installed
import Roboto from "./fonts.js";
pdfmake.addFonts(Roboto);

pdfmake.setUrlAccessPolicy((url) => {
	// this can be used to restrict allowed domains
	return url.startsWith("https://");
});

pdfmake.setLocalAccessPolicy((path) => {
	// this can be used to restrict access to local file system
	return true;
});

var docDefinition = {
	//userPassword: '123',
	ownerPassword: "123456",
	permissions: {
		printing: "highResolution", //'lowResolution'
		modifying: false,
		copying: false,
		annotating: true,
		fillingForms: true,
		contentAccessibility: true,
		documentAssembly: true,
	},
	content: ["Document content with security", "For details see to source or documentation."],
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write("pdfs/security.pdf").then(
	() => {
		console.log(new Date() - now);
	},
	(err) => {
		console.error(err);
	},
);
