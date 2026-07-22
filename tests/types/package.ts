import pdfcraft from "pdfcraft";
import type { DocumentDefinition, Options, OutputDocumentServer } from "pdfcraft/types";

const options: Options = {};

const instance = pdfcraft.createPdfCraft({
	...options,
	fonts: {
		Roboto: {
			normal: "Roboto-Regular.ttf",
		},
	},
});

const definition: DocumentDefinition = {
	content: [
		{
			text: "TypeScript consumer test",
			opacity: 0.8,
			fontFeatures: ["liga"],
			decorationThickness: 0.5,
			outline: true,
			tocItem: "contents",
		},
		{ section: ["Typed section"], pageSize: "inherit" },
		{
			canvas: [
				{
					type: "path",
					d: "M 0 0 L 10 10",
					lineOpacity: 0.5,
					strokeOpacity: 0.5,
					dash: { length: 2, phase: 1 },
				},
			],
		},
		{ qr: "typed", mask: 1, padding: 2 },
		{ toc: { id: "contents", sortBy: "title", outlines: true, hideEmpty: true } },
	],
	files: { source: { src: "source.txt", name: "source.txt" } },
	version: "1.7",
	tagged: true,
	permissions: { printing: "highResolution", copying: false },
};

const misspelledDefinition: DocumentDefinition = {
	content: [],
	// @ts-expect-error Unknown document-definition properties must be rejected.
	pageOrientaton: "landscape",
};

const unknownPropertyDefinition: DocumentDefinition = {
	content: [],
	// @ts-expect-error Arbitrary root properties are not part of the public contract.
	customProperty: true,
};

const misspelledContentProperty: DocumentDefinition = {
	content: {
		text: "Typed content",
		// @ts-expect-error Content nodes reject misspelled style properties.
		fontSze: 12,
	},
};

void misspelledDefinition;
void unknownPropertyDefinition;
void misspelledContentProperty;
const document: OutputDocumentServer = instance.createPdf(definition);

document.getBuffer().then((buffer) => buffer.byteLength);
document.write("document.pdf");
instance.setUrlAccessPolicy((url) => url.startsWith("https://"));
