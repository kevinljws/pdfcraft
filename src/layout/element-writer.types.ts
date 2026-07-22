import type { LineLike, PageBreak } from "../types/internal";

export interface ElementWriterEvents {
	lineAdded: [line: LineLike];
	pageChanged: [change: PageBreak];
	columnChanged: [change: { prevY: number; y: number }];
}
