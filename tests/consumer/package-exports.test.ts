import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("package exports", () => {
	it("exposes the same factory through ESM and CommonJS", async () => {
		const esm = (await import("pdfcraft")).default;
		const commonjs = createRequire(import.meta.url)("pdfcraft") as typeof esm;

		expect(esm.createPdfCraft).toBeTypeOf("function");
		expect(commonjs.createPdfCraft).toBeTypeOf("function");
		expect(esm.createPdfCraft()).toBeInstanceOf(esm.PdfCraft);
		expect(commonjs.createPdfCraft()).toBeInstanceOf(commonjs.PdfCraft);
	});

	it("publishes Node declarations without ambient browser or PDFKit requirements", async () => {
		for (const declaration of ["dist/index.d.mts", "dist/index.d.cts", "dist/types.d.ts"]) {
			const source = await readFile(new URL(`../../${declaration}`, import.meta.url), "utf8");
			expect(source).not.toMatch(/PDFKit\.|HeadersInit|\bBlob\b|\bWindow\b/);
		}
	});
});
