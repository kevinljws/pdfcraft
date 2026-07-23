import { defaultTableLayout } from "../configuration/table-layouts";
import type { Dictionary } from "../types";
import type {
	ColumnWidth,
	MeasuredPdfNode,
	PdfTable,
	RawColumnWidth,
	TableLayout,
} from "../types/internal";
import { pack } from "../utils/tools";
import { isNumber, isObject, isString } from "../utils/variable-type";

export function resolveTableLayout(
	node: MeasuredPdfNode,
	tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>,
): TableLayout<MeasuredPdfNode> {
	const layout = isString(node.layout) ? tableLayouts[node.layout] : node.layout;
	return pack<TableLayout<MeasuredPdfNode>>(
		defaultTableLayout,
		isObject(layout) ? (layout as Partial<TableLayout>) : undefined,
	);
}

export interface TableOffsets {
	total: number;
	offsets: number[];
}

export interface ColumnSpanMeasurement {
	col: number;
	span: number;
	minWidth: number;
	maxWidth: number;
}

export function getTableOffsets(
	node: MeasuredPdfNode,
	layout: TableLayout<MeasuredPdfNode>,
): TableOffsets {
	const table = node.table!;
	const offsets: number[] = [];
	let total = 0;
	let previousRightPadding = 0;

	for (let index = 0; index < table.widths.length; index++) {
		const leftOffset =
			previousRightPadding + layout.vLineWidth(index, node) + layout.paddingLeft(index, node);
		offsets.push(leftOffset);
		total += leftOffset;
		previousRightPadding = layout.paddingRight(index, node);
	}

	total += previousRightPadding + layout.vLineWidth(table.widths.length, node);
	return { total, offsets };
}

export function extendWidthsForColumnSpans(
	node: MeasuredPdfNode,
	columnSpans: ColumnSpanMeasurement[],
): void {
	const table = node.table!;
	const offsets = node._offsets!;
	for (const span of columnSpans) {
		const current = getMinMax(node, span.col, span.span, offsets);
		const minimumDifference = span.minWidth - current.minWidth;
		const maximumDifference = span.maxWidth - current.maxWidth;
		const spannedColumns = table.widths.slice(span.col, span.col + span.span);
		const starColumns = spannedColumns.filter(
			(column) =>
				column.width === undefined ||
				column.width === null ||
				column.width === "*" ||
				column.width === "star",
		);
		const autoColumns = spannedColumns.filter((column) => column.width === "auto");
		const expandableColumns =
			starColumns.length > 0 ? starColumns : autoColumns.length > 0 ? autoColumns : spannedColumns;

		if (minimumDifference > 0) {
			const increment = minimumDifference / expandableColumns.length;
			for (const column of expandableColumns) {
				column._minWidth += increment;
			}
		}

		if (maximumDifference > 0) {
			const increment = maximumDifference / expandableColumns.length;
			for (const column of expandableColumns) {
				column._maxWidth += increment;
			}
		}
	}
}

function getMinMax(
	node: MeasuredPdfNode,
	column: number,
	span: number,
	offsets: TableOffsets,
): { minWidth: number; maxWidth: number } {
	const table = node.table!;
	const result = { minWidth: 0, maxWidth: 0 };
	for (let index = 0; index < span; index++) {
		result.minWidth +=
			table.widths[column + index]._minWidth + (index ? offsets.offsets[column + index] : 0);
		result.maxWidth +=
			table.widths[column + index]._maxWidth + (index ? offsets.offsets[column + index] : 0);
	}
	return result;
}

export function markColumnSpans(row: MeasuredPdfNode[], column: number, span: number): void {
	for (let index = 1; index < span; index++) {
		row[column + index] = {
			_span: true,
			_minWidth: 0,
			_maxWidth: 0,
			rowSpan: row[column].rowSpan,
		};
	}
}

export function markRowSpans(
	table: PdfTable<MeasuredPdfNode>,
	row: number,
	column: number,
	span: number,
): void {
	for (let index = 1; index < span; index++) {
		table.body[row + index][column] = {
			_span: true,
			_minWidth: 0,
			_maxWidth: 0,
			fillColor: table.body[row][column].fillColor,
			fillOpacity: table.body[row][column].fillOpacity,
		};
	}
}

export function extendTableWidths(node: MeasuredPdfNode): void {
	const table = node.table!;
	const rawWidths = table.widths ?? "auto";
	const widths = Array.isArray(rawWidths) ? [...rawWidths] : [rawWidths];
	while (widths.length < table.body[0].length) {
		widths.push(widths[widths.length - 1]);
	}
	table.widths = widths.map((width: RawColumnWidth): ColumnWidth => {
		if (isNumber(width) || isString(width)) {
			return { width, _minWidth: 0, _maxWidth: 0 };
		}
		return width;
	});
}
