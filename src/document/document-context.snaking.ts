import type { PageMargins, PdfPage } from "../types/internal";
import EventEmitter from "../utils/event-emitter";
import type { DocumentContextEvents } from "./document-context.events";
import { findSnakingSnapshot, hasNestedNonSnakingGroup } from "./document-context.helpers";
import type { ColumnEndingCell, ContextSnapshot } from "./document-context.types";

abstract class DocumentContextSnaking extends EventEmitter<DocumentContextEvents> {
	pages: PdfPage[] = [];
	pageMargins: PageMargins = { left: 0, right: 0, top: 0, bottom: 0 };
	x = 0;
	y = 0;
	availableWidth = 0;
	availableHeight = 0;
	page = -1;
	snapshots: ContextSnapshot[] = [];
	backgroundLength: number[] = [];
	lastColumnWidth = 0;
	marginXTopParent: [number, number] | null = null;
	height = 0;

	getSnakingSnapshot(): ContextSnapshot | null {
		return findSnakingSnapshot(this.snapshots);
	}

	inSnakingColumns(): boolean {
		return this.getSnakingSnapshot() !== null;
	}

	isInNestedNonSnakingGroup(): boolean {
		return hasNestedNonSnakingGroup(this.snapshots);
	}

	moveToNextColumn(): { prevY: number; y: number } {
		const prevY = this.y;
		const snakingSnapshot = this.getSnakingSnapshot();
		if (!snakingSnapshot) {
			return { prevY, y: this.y };
		}

		this.calculateBottomMost(snakingSnapshot, null);
		let overflowCount = 0;
		for (let index = this.snapshots.length - 1; index >= 0; index--) {
			if (!this.snapshots[index].overflowed) break;
			overflowCount++;
		}

		const currentColumnWidth =
			snakingSnapshot.columnWidths?.[overflowCount] || this.lastColumnWidth || this.availableWidth;
		const nextColumnWidth = snakingSnapshot.columnWidths?.[overflowCount + 1] || currentColumnWidth;
		const newX = this.x + currentColumnWidth + (snakingSnapshot.gap || 0);
		const newY = snakingSnapshot.y;

		this.lastColumnWidth = nextColumnWidth;
		this.snapshots.push({
			x: newX,
			y: newY,
			availableHeight: snakingSnapshot.availableHeight,
			availableWidth: nextColumnWidth,
			page: this.page,
			overflowed: true,
			bottomMost: {
				x: newX,
				y: newY,
				availableHeight: snakingSnapshot.availableHeight,
				availableWidth: nextColumnWidth,
				page: this.page,
			},
			lastColumnWidth: nextColumnWidth,
			snakingColumns: true,
			gap: snakingSnapshot.gap,
			columnWidths: snakingSnapshot.columnWidths,
			bottomByPage: {},
		});

		this.x = newX;
		this.y = newY;
		this.availableHeight = snakingSnapshot.availableHeight;
		this.availableWidth = nextColumnWidth;

		for (let index = this.snapshots.length - 2; index >= 0; index--) {
			const snapshot = this.snapshots[index];
			if (snapshot.overflowed || snapshot.snakingColumns) break;
			snapshot.x = newX;
			snapshot.y = newY;
			snapshot.page = this.page;
			snapshot.availableHeight = snakingSnapshot.availableHeight;
			if (snapshot.bottomMost) {
				snapshot.bottomMost.x = newX;
				snapshot.bottomMost.y = newY;
				snapshot.bottomMost.page = this.page;
				snapshot.bottomMost.availableHeight = snakingSnapshot.availableHeight;
			}
		}

		return { prevY, y: this.y };
	}

	resetSnakingColumnsForNewPage(): void {
		const snakingSnapshot = this.getSnakingSnapshot();
		if (!snakingSnapshot) return;

		const pageTopY = this.pageMargins.top;
		const pageInnerHeight =
			this.getCurrentPage().pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
		const firstColumnWidth =
			snakingSnapshot.columnWidths?.[0] || this.lastColumnWidth || this.availableWidth;

		while (this.snapshots.length > 1 && this.snapshots.at(-1)?.overflowed) {
			this.snapshots.pop();
		}

		this.x = this.marginXTopParent
			? this.pageMargins.left + this.marginXTopParent[0]
			: this.pageMargins.left;
		this.availableWidth = firstColumnWidth;
		this.lastColumnWidth = firstColumnWidth;

		for (const snapshot of this.snapshots) {
			const isSnakingSnapshot = Boolean(snapshot.snakingColumns);
			snapshot.x = this.x;
			snapshot.y = isSnakingSnapshot ? pageTopY : this.y;
			snapshot.availableHeight = isSnakingSnapshot ? pageInnerHeight : this.availableHeight;
			snapshot.page = this.page;
			if (snapshot.bottomMost) {
				snapshot.bottomMost.x = this.x;
				snapshot.bottomMost.y = isSnakingSnapshot ? pageTopY : this.y;
				snapshot.bottomMost.availableHeight = isSnakingSnapshot
					? pageInnerHeight
					: this.availableHeight;
				snapshot.bottomMost.page = this.page;
			}
		}
	}

	abstract calculateBottomMost(
		destination: ContextSnapshot,
		endingCell: ColumnEndingCell | null,
	): void;
	abstract getCurrentPage(): PdfPage;
}

export default DocumentContextSnaking;
