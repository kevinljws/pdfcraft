import type { PageOrientation } from "../types";
import type { Metadata, PageMargins, PageSize, PdfPage } from "../types/internal";
import DocumentContextColumns from "./document-context.columns";
import { bottomMostContext, getPageSize } from "./document-context.geometry";
import { createPage, getPagePosition } from "./document-context.helpers";
import type { ContextSnapshot, PagePosition } from "./document-context.types";

class DocumentContext extends DocumentContextColumns {
	constructor() {
		super();
	}

	addMargin(left: number, right = 0): void {
		this.x += left;
		this.availableWidth -= left + right;
	}

	moveDown(offset: number): boolean {
		this.y += offset;
		this.availableHeight -= offset;
		return this.availableHeight > 0;
	}

	initializePage(): void {
		this.y = this.pageMargins.top;
		this.availableHeight =
			this.getCurrentPage().pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
		const { pageCtx, isSnapshot } = this.pageSnapshot();
		pageCtx.availableWidth =
			this.getCurrentPage().pageSize.width - this.pageMargins.left - this.pageMargins.right;
		if (isSnapshot && this.marginXTopParent) {
			pageCtx.availableWidth -= this.marginXTopParent[0] + this.marginXTopParent[1];
		}
	}

	pageSnapshot(): { pageCtx: ContextSnapshot | DocumentContext; isSnapshot: boolean } {
		return this.snapshots[0]
			? { pageCtx: this.snapshots[0], isSnapshot: true }
			: { pageCtx: this, isSnapshot: false };
	}

	moveTo(x: number, y: number): void {
		if (x != null) {
			this.x = x;
			this.availableWidth = this.getCurrentPage().pageSize.width - x - this.pageMargins.right;
		}
		if (y != null) {
			this.y = y;
			this.availableHeight = this.getCurrentPage().pageSize.height - y - this.pageMargins.bottom;
		}
	}

	moveToRelative(x: number, y: number): void {
		if (x != null) this.x += x;
		if (y != null) this.y += y;
	}

	beginDetachedBlock(): void {
		this.snapshots.push({
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			page: this.page,
			lastColumnWidth: this.lastColumnWidth,
			bottomByPage: {},
			bottomMost: {
				x: this.x,
				y: this.y,
				availableHeight: this.availableHeight,
				availableWidth: this.availableWidth,
				page: this.page,
			},
		});
	}

	endDetachedBlock(): void {
		const saved = this.snapshots.pop();
		if (!saved) return;
		this.x = saved.x;
		this.y = saved.y;
		this.availableWidth = saved.availableWidth;
		this.availableHeight = saved.availableHeight;
		this.page = saved.page;
		this.lastColumnWidth = saved.lastColumnWidth;
	}

	moveToNextPage(pageOrientation?: PageOrientation): {
		newPageCreated: boolean;
		prevPage: number;
		prevY: number;
		y: number;
	} {
		const nextPageIndex = this.page + 1;
		const prevPage = this.page;
		let prevY = this.y;
		const lastSnapshot = this.snapshots.at(-1);
		if (lastSnapshot?.bottomMost?.y) {
			prevY = Math.max(this.y, lastSnapshot.bottomMost.y);
		}

		const createNewPage = nextPageIndex >= this.pages.length;
		if (createNewPage) {
			const currentAvailableWidth = this.availableWidth;
			const currentPageOrientation = this.getCurrentPage().pageSize.orientation;
			const pageSize = getPageSize(this.getCurrentPage(), pageOrientation);
			this.addPage(pageSize, null, this.getCurrentPage().customProperties);
			if (currentPageOrientation === pageSize.orientation) {
				this.availableWidth = currentAvailableWidth;
			}
		} else {
			this.page = nextPageIndex;
			this.initializePage();
		}

		return { newPageCreated: createNewPage, prevPage, prevY, y: this.y };
	}

	addPage(
		pageSize: PageSize,
		pageMargin: PageMargins | null = null,
		customProperties: Metadata = {},
	): PdfPage {
		if (pageMargin !== null) {
			this.pageMargins = pageMargin;
			this.x = pageMargin.left;
			this.availableWidth = pageSize.width - pageMargin.left - pageMargin.right;
		}

		const page = createPage(pageSize, this.pageMargins, customProperties);
		this.pages.push(page);
		this.backgroundLength.push(0);
		this.page = this.pages.length - 1;
		this.initializePage();
		this.emit("pageAdded", page);
		return page;
	}

	getCurrentPage(): PdfPage {
		return this.pages[this.page];
	}

	getCurrentPosition(): PagePosition {
		return getPagePosition(this.getCurrentPage(), this.page, this.pageMargins, this.x, this.y);
	}
}

export { bottomMostContext };
export default DocumentContext;
