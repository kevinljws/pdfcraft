import { assert, describe, it } from "vitest";
import type OutputDocumentBrowser from "../../src/output/output-document.browser";
import type { PdfDocumentStream } from "../../src/output/output-document";
import type pdfcraftEntry from "pdfcraft/browser";

type StreamListener = (...args: unknown[]) => void;

class FakePdfStream {
	#chunk: Uint8Array | null = new Uint8Array([1, 2, 3]);
	#listeners = new Map<string, StreamListener[]>();

	on(event: string, listener: StreamListener): this {
		const listeners = this.#listeners.get(event) ?? [];
		listeners.push(listener);
		this.#listeners.set(event, listeners);
		return this;
	}

	#emit(event: string, ...args: unknown[]): void {
		for (const listener of this.#listeners.get(event) ?? []) {
			listener(...args);
		}
	}

	read(): Uint8Array | null {
		const chunk = this.#chunk;
		this.#chunk = null;
		return chunk;
	}

	end(): void {
		queueMicrotask(() => {
			this.#emit("readable");
			this.#emit("end");
		});
	}

	setOpenActionAsPrint(): void {}
}

describe("browser package entry", function () {
	async function assertBrowserOutput(pdfcraft: typeof pdfcraftEntry) {
		const instance = pdfcraft.createPdfCraft();
		const transform = instance as unknown as {
			_transformToDocument(document: Promise<PdfDocumentStream>): OutputDocumentBrowser;
		};
		const output = transform._transformToDocument(
			Promise.resolve(new FakePdfStream() as unknown as PdfDocumentStream),
		);

		assert.equal(typeof output.getBlob, "function");
		assert.equal(typeof output.download, "function");
		assert.equal(typeof output.open, "function");
		assert.equal(typeof output.print, "function");
		assert.equal("write" in output, false);
		assert.deepEqual(await output.getBuffer(), new Uint8Array([1, 2, 3]));
		assert.equal(await output.getBase64(), "AQID");
	}

	it("exposes browser-specific output methods from the modern ESM entry", async function () {
		assert.equal(typeof window.document.createElement, "function");
		const { default: pdfcraft } = await import("pdfcraft/browser");
		await assertBrowserOutput(pdfcraft);
	});

	it("generates a PDF with a browser-loaded font", async function () {
		const { default: pdfcraft } = await import("pdfcraft/browser");
		const instance = pdfcraft.createPdfCraft();
		const regularFont = new URL("../../fonts/Roboto/Roboto-Regular.ttf", import.meta.url).href;

		instance.addFonts({
			Roboto: {
				normal: regularFont,
				bold: regularFont,
				italics: regularFont,
				bolditalics: regularFont,
			},
		});

		const blob = await instance.createPdf({ content: ["Browser PDF"] }).getBlob();

		assert.equal(blob.type, "application/pdf");
		assert.isAbove(blob.size, 0);
	});
});
