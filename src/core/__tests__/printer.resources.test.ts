import { describe, expect, it, vi } from "vitest";

import type URLResolver from "../../resources/url-resolver";
import type { PrinterDocumentDefinition } from "../printer.types";
import { resolvePrinterUrls } from "../printer.resources";

describe("resolvePrinterUrls", () => {
	it("resolves attachment references without treating binary data as a URL", async () => {
		const binary = new Uint8Array([1, 2, 3]);
		const resolveReference = vi.fn((url: string) => `resolved:${url}`);
		const documentDefinition: PrinterDocumentDefinition = {
			content: [],
			attachments: {
				binary: { src: binary },
				remote: "https://example.com/file.txt",
			},
		};
		const resolver = {
			resolveReference,
			resolved: vi.fn(async () => {}),
		} as unknown as URLResolver;

		await resolvePrinterUrls(documentDefinition, {}, resolver);

		expect(documentDefinition.attachments).toEqual({
			binary: { src: binary },
			remote: { src: "resolved:https://example.com/file.txt" },
		});
		expect(resolveReference).toHaveBeenCalledOnce();
	});

	it("resolves named SVG resources", async () => {
		const resolveReference = vi.fn((url: string) => `resolved:${url}`);
		const documentDefinition: PrinterDocumentDefinition = {
			content: [],
			svgs: { logo: "https://example.com/logo.svg" },
		};
		const resolver = {
			resolveReference,
			resolved: vi.fn(async () => {}),
		} as unknown as URLResolver;

		await resolvePrinterUrls(documentDefinition, {}, resolver);

		expect(documentDefinition.svgs).toEqual({
			logo: "resolved:https://example.com/logo.svg",
		});
	});
});
