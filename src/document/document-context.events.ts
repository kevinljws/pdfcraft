import type { PdfPage } from "../types/internal";

export interface DocumentContextEvents {
	pageAdded: [page: PdfPage];
}
