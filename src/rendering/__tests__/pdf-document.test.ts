import { assert, beforeEach, describe, expect, it } from "vitest";
import PDFDocument from "../pdf-document.ts";

describe("PDFDocument", function () {
	let pdfDocument: PDFDocument;

	beforeEach(function () {
		var fontDefinitions = {
			Roboto: {
				normal: "fonts/Roboto/Roboto-Regular.ttf",
				bold: "fonts/Roboto/Roboto-Medium.ttf",
				italics: "fonts/Roboto/Roboto-Italic.ttf",
				bolditalics: "fonts/Roboto/Roboto-MediumItalic.ttf",
			},
		};
		pdfDocument = new PDFDocument(fontDefinitions);
	});

	describe("provideFont", function () {
		it("throws error when given font not present", function () {
			expect(() => pdfDocument.provideFont("Arial", true, false)).toThrow(
				"Font 'Arial' in style 'bold' is not defined in the font section of the document definition.",
			);
		});

		it("should provide normal Roboto font", function () {
			var result = pdfDocument.provideFont("Roboto", false, false);
			assert.equal(result.font.postscriptName, "Roboto-Regular");
		});

		it("should provide bold Roboto font", function () {
			var result = pdfDocument.provideFont("Roboto", true, false);
			assert.equal(result.font.postscriptName, "Roboto-Medium");
		});

		it("should provide italics Roboto font", function () {
			var result = pdfDocument.provideFont("Roboto", false, true);
			assert.equal(result.font.postscriptName, "Roboto-Italic");
		});

		it("should provide bold and italics Roboto font", function () {
			var result = pdfDocument.provideFont("Roboto", true, true);
			assert.equal(result.font.postscriptName, "Roboto-MediumItalic");
		});
	});

	describe("resolveColor", function () {
		it("should resolve valid color name", function () {
			assert.equal(pdfDocument.resolveColor("red"), "red");
		});

		it("should resolve default color", function () {
			assert.equal(pdfDocument.resolveColor(undefined, "red"), "red");
		});

		it("should resolve hex color", function () {
			assert.equal(pdfDocument.resolveColor("#f900f8"), "#f900f8");
		});

		it("should resolve invalid color name", function () {
			assert.equal(pdfDocument.resolveColor("invalid"), null);
		});

		it("should resolve invalid color name with default", function () {
			assert.equal(pdfDocument.resolveColor("invalid", "red"), "red");
		});
	});
});
