import PdfCraftBase from "./core/pdfcraft";
import OutputDocumentServer from "./output/output-document.server";
import type { PdfDocumentStream } from "./output/output-document";
import type { AccessPolicy, PdfCraftOptions } from "./types";

class PdfCraft extends PdfCraftBase<OutputDocumentServer> {
	declare localAccessPolicy: AccessPolicy | undefined;

	constructor(options: PdfCraftOptions = {}) {
		super(options);
	}

	/**
	 * @param callback
	 */
	setLocalAccessPolicy(callback?: AccessPolicy): void {
		if (callback !== undefined && typeof callback !== "function") {
			throw new Error("Parameter 'callback' has an invalid type. Function or undefined expected.");
		}

		this.localAccessPolicy = callback;
	}

	override _transformToDocument(doc: Promise<PdfDocumentStream>): OutputDocumentServer {
		return new OutputDocumentServer(doc);
	}
}

export default Object.assign(new PdfCraft(), {
	createPdfCraft(options: PdfCraftOptions = {}): PdfCraft {
		return new PdfCraft(options);
	},
	PdfCraft,
});
