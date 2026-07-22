import PdfCraftBase from "../core/pdfcraft";
import OutputDocumentBrowser from "../output/output-document.browser";
import type { PdfDocumentStream } from "../output/output-document";
import type { PdfCraftOptions, VfsEncoding } from "../types";
import type { FontContainer } from "../types/internal";

class PdfCraft extends PdfCraftBase<OutputDocumentBrowser> {
	constructor(options: PdfCraftOptions = {}) {
		super(options);
	}

	addFontContainer(fontContainer: FontContainer): void {
		this.addVirtualFileSystem(fontContainer.vfs);
		this.addFonts(fontContainer.fonts);
	}

	addVirtualFileSystem(vfs: FontContainer["vfs"]): void {
		for (const [key, value] of Object.entries(vfs)) {
			const data = typeof value === "object" ? value.data : value;
			const encoding: VfsEncoding =
				typeof value === "object" ? (value.encoding ?? "base64") : "base64";
			this.virtualfs.writeFileSync(key, data, encoding);
		}
	}

	override _transformToDocument(doc: Promise<PdfDocumentStream>): OutputDocumentBrowser {
		return new OutputDocumentBrowser(doc);
	}
}

const createPdfCraft = (options: PdfCraftOptions = {}): PdfCraft => new PdfCraft(options);
const pdfcraft = Object.assign(createPdfCraft(), { createPdfCraft, PdfCraft });

export type { OutputDocumentBrowser } from "../types";
export default pdfcraft;
