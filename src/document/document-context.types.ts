import type { PageOrientation } from "../types";
import type { Metadata, PageMargins, PageSize } from "../types/internal";

export interface ContextCoordinates {
	x: number;
	y: number;
	availableWidth: number;
	availableHeight: number;
	page: number;
}

export interface ContextSnapshot extends ContextCoordinates {
	bottomByPage: Record<number, number>;
	bottomMost: ContextCoordinates;
	lastColumnWidth: number;
	overflowed?: boolean;
	snakingColumns?: boolean;
	gap?: number;
	columnWidths?: number[] | null;
}

export interface ColumnEndingContext extends ContextCoordinates {
	lastColumnWidth?: number;
}

export interface ColumnEndingCell {
	_columnEndingContext?: ColumnEndingContext;
}

export interface PagePosition {
	pageNumber: number;
	pageOrientation: PageOrientation;
	pageInnerHeight: number;
	pageInnerWidth: number;
	left: number;
	top: number;
	verticalRatio: number;
	horizontalRatio: number;
}

export interface CreatePageOptions {
	pageSize: PageSize;
	pageMargins: PageMargins;
	customProperties: Metadata;
}
