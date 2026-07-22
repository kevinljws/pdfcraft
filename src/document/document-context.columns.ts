import { bottomMostContext } from "./document-context.geometry";
import type { ColumnEndingCell, ContextSnapshot } from "./document-context.types";
import DocumentContextSnaking from "./document-context.snaking";

/**
 * A store for current x, y positions and available width/height.
 * It facilitates column divisions and vertical sync
 */
abstract class DocumentContextColumns extends DocumentContextSnaking {
	beginColumnGroup(
		marginXTopParent: [number, number] | null = null,
		bottomByPage: Record<number, number> = {},
		snakingColumns: boolean = false,
		columnGap: number = 0,
		columnWidths: number[] | null = null,
	): void {
		this.snapshots.push({
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			page: this.page,
			bottomByPage: bottomByPage ? bottomByPage : {},
			bottomMost: {
				x: this.x,
				y: this.y,
				availableHeight: this.availableHeight,
				availableWidth: this.availableWidth,
				page: this.page,
			},
			lastColumnWidth: this.lastColumnWidth,
			snakingColumns: snakingColumns,
			gap: columnGap,
			columnWidths: columnWidths,
		});

		this.lastColumnWidth = 0;
		if (marginXTopParent) {
			this.marginXTopParent = marginXTopParent;
		}
	}

	updateBottomByPage(): void {
		const lastSnapshot = this.snapshots[this.snapshots.length - 1];
		if (!lastSnapshot) {
			return;
		}
		const lastPage = this.page;
		let previousBottom = -Number.MIN_VALUE;
		if (lastSnapshot.bottomByPage && lastSnapshot.bottomByPage[lastPage]) {
			previousBottom = lastSnapshot.bottomByPage[lastPage];
		}
		if (lastSnapshot.bottomByPage) {
			lastSnapshot.bottomByPage[lastPage] = Math.max(previousBottom, this.y);
		}
	}

	resetMarginXTopParent(): void {
		this.marginXTopParent = null;
	}

	beginColumn(
		width: number = this.availableWidth,
		offset: number = 0,
		endingCell: ColumnEndingCell | null = null,
	): void {
		// Find the correct snapshot for this column group.
		// When a snaking column break (moveToNextColumn) occurs during inner column
		// processing, overflowed snapshots may sit above this column group's snapshot.
		// We need to skip past those to find the one from our beginColumnGroup call.
		let saved = this.snapshots[this.snapshots.length - 1];
		if (saved && saved.overflowed) {
			for (let i = this.snapshots.length - 1; i >= 0; i--) {
				if (!this.snapshots[i].overflowed) {
					saved = this.snapshots[i];
					break;
				}
			}
		}

		this.calculateBottomMost(saved, endingCell);

		this.page = saved.page;
		this.x = this.x + this.lastColumnWidth + (offset || 0);
		this.y = saved.y;
		this.availableWidth = width; //saved.availableWidth - offset;
		this.availableHeight = saved.availableHeight;

		this.lastColumnWidth = width;
	}

	override calculateBottomMost(
		destContext: ContextSnapshot,
		endingCell: ColumnEndingCell | null,
	): void {
		if (endingCell) {
			this.saveContextInEndingCell(endingCell);
		} else {
			destContext.bottomMost = bottomMostContext(this, destContext.bottomMost);
		}
	}

	markEnding(endingCell: ColumnEndingCell, originalXOffset = 0, discountY = 0): void {
		const endingContext = endingCell._columnEndingContext;
		if (!endingContext) {
			throw new Error("Column ending context is missing");
		}
		this.page = endingContext.page;
		this.x = endingContext.x + originalXOffset;
		this.y = endingContext.y - discountY;
		this.availableWidth = endingContext.availableWidth;
		this.availableHeight = endingContext.availableHeight;
		this.lastColumnWidth = endingContext.lastColumnWidth ?? this.lastColumnWidth;
	}

	saveContextInEndingCell(endingCell: ColumnEndingCell): void {
		endingCell._columnEndingContext = {
			page: this.page,
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			lastColumnWidth: this.lastColumnWidth,
		};
	}

	completeColumnGroup(
		height = 0,
		endingCell: ColumnEndingCell | null | undefined = null,
	): Record<number, number> {
		let saved = this.snapshots.pop();
		if (!saved) {
			return {};
		}

		// Track the maximum bottom position across all columns (including overflowed).
		// Critical for snaking: content after columns must appear below the tallest column.
		let maxBottomY = this.y;
		let maxBottomPage = this.page;
		let maxBottomAvailableHeight = this.availableHeight;

		let overflowed = saved.overflowed;

		// Pop overflowed snapshots created by moveToNextColumn (snaking columns).
		// Merge their bottomMost values to find the true maximum.
		while (saved && saved.overflowed) {
			let bm = bottomMostContext(
				{
					x: this.x,
					page: maxBottomPage,
					y: maxBottomY,
					availableHeight: maxBottomAvailableHeight,
					availableWidth: this.availableWidth,
				},
				saved.bottomMost,
			);
			maxBottomPage = bm.page;
			maxBottomY = bm.y;
			maxBottomAvailableHeight = bm.availableHeight;
			saved = this.snapshots.pop();
		}

		if (!saved) {
			return {};
		}

		if (overflowed) {
			// Apply the max bottom from all overflowed columns to this base snapshot
			if (
				maxBottomPage > saved.bottomMost.page ||
				(maxBottomPage === saved.bottomMost.page && maxBottomY > saved.bottomMost.y)
			) {
				saved.bottomMost = {
					x: saved.x,
					y: maxBottomY,
					page: maxBottomPage,
					availableHeight: maxBottomAvailableHeight,
					availableWidth: saved.availableWidth,
				};
			}
		}

		this.calculateBottomMost(saved, endingCell ?? null);

		this.x = saved.x;

		let y = saved.bottomMost.y;
		if (height) {
			if (saved.page === saved.bottomMost.page) {
				if (saved.y + height > y) {
					y = saved.y + height;
				}
			} else {
				y += height;
			}
		}

		this.y = y;
		this.page = saved.bottomMost.page;
		this.availableWidth = saved.availableWidth;
		this.availableHeight = saved.bottomMost.availableHeight;
		if (height) {
			this.availableHeight -= y - saved.bottomMost.y;
		}

		if (height && saved.bottomMost.y - saved.y < height) {
			this.height = height;
		} else {
			this.height = saved.bottomMost.y - saved.y;
		}

		this.lastColumnWidth = saved.lastColumnWidth;
		return saved.bottomByPage;
	}
}

export default DocumentContextColumns;
