import { assert, describe, it } from "vitest";
import ColumnCalculator from "../column-calculator.ts";
import type { ColumnWidth, PdfNode } from "../../types/internal";

describe("ColumnCalculator", function () {
	describe("buildColumnWidths", function () {
		it("should set calcWidth to specified width for fixed columns", function () {
			const columns: ColumnWidth[] = [
				{ width: 50, _minWidth: 30, _maxWidth: 80 },
				{ width: 35, _minWidth: 30, _maxWidth: 80 },
				{ width: 20, _minWidth: 30, _maxWidth: 80 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function (col) {
				assert.equal(col._calcWidth, col.width);
			});
		});

		it("should set calcWidth to minWidth for fixed columns with elasticWidth set to true", function () {
			const columns: ColumnWidth[] = [
				{ width: 50, _minWidth: 30, _maxWidth: 80 },
				{ width: 35, _minWidth: 30, _maxWidth: 80 },
				{ width: 20, _minWidth: 30, _maxWidth: 80, elasticWidth: true },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			assert.equal(columns[0]._calcWidth, columns[0].width);
			assert.equal(columns[1]._calcWidth, columns[1].width);
			assert.equal(columns[2]._calcWidth, columns[2]._minWidth);
		});

		it("should set auto to maxWidth if there is enough space for all columns", function () {
			const columns: ColumnWidth[] = [
				{ width: "auto", _minWidth: 30, _maxWidth: 41 },
				{ width: "auto", _minWidth: 30, _maxWidth: 42 },
				{ width: "auto", _minWidth: 30, _maxWidth: 43 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function (col) {
				assert.equal(col._calcWidth, col._maxWidth);
			});
		});

		it("should equally divide availableSpace to star columns", function () {
			const columns: ColumnWidth[] = [
				{ width: "*", _minWidth: 30, _maxWidth: 41 },
				{ width: "star", _minWidth: 30, _maxWidth: 42 },
				{ _minWidth: 30, _maxWidth: 43 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function (col) {
				assert.equal(col._calcWidth, 320 / 3);
			});
		});

		it("should set calcWidth to minWidth if there is not enough space for the table", function () {
			const columns: ColumnWidth[] = [
				{ width: "auto", _minWidth: 300, _maxWidth: 410 },
				{ width: "auto", _minWidth: 301, _maxWidth: 420 },
				{ width: "auto", _minWidth: 303, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function (col) {
				assert.equal(col._calcWidth, col._minWidth);
			});
		});

		it("should set calcWidth of star columns to largest star min-width if there is not enough space for the table", function () {
			const columns: ColumnWidth[] = [
				{ width: "auto", _minWidth: 300, _maxWidth: 410 },
				{ width: "*", _minWidth: 301, _maxWidth: 420 },
				{ width: "star", _minWidth: 303, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);
			assert.equal(columns[0]._calcWidth, columns[0]._minWidth);
			assert.equal(columns[1]._calcWidth, 303);
			assert.equal(columns[2]._calcWidth, 303);
		});

		it("should make columns wider proportionally if table can fit within the available space", function () {
			const columns: ColumnWidth[] = [
				{ width: "auto", _minWidth: 30, _maxWidth: 41 },
				{ width: "auto", _minWidth: 31, _maxWidth: 42 },
				{ width: "auto", _minWidth: 33, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);
			assert((columns[0]._calcWidth ?? 0) > 30);
			assert((columns[1]._calcWidth ?? 0) > 31);
			assert((columns[2]._calcWidth ?? 0) > 220);
		});

		it("should first take into account auto columns and then divide remaining space equally between all star if there is enough space for the table", function () {
			const columns: ColumnWidth[] = [
				{ width: "*", _minWidth: 30, _maxWidth: 41 },
				{ width: "auto", _minWidth: 31, _maxWidth: 42 },
				{ width: "*", _minWidth: 33, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);
			assert((columns[1]._calcWidth ?? 0) > 31);
			assert.equal(columns[0]._calcWidth, columns[0]._calcWidth);
			assert.equal(
				(columns[0]._calcWidth ?? 0) + (columns[1]._calcWidth ?? 0) + (columns[2]._calcWidth ?? 0),
				320,
			);
		});

		it("should calculate widths of columns correctly", function () {
			const availableWidth = 200;
			const columns: ColumnWidth[] = [
				{ width: "25%", _minWidth: 30, _maxWidth: 41 },
				{ width: "50%", _minWidth: 31, _maxWidth: 42 },
				{ width: "25%", _minWidth: 33, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, availableWidth);
			assert.equal(columns[0]._calcWidth, 50);
			assert.equal(columns[1]._calcWidth, 100);
			assert.equal(columns[2]._calcWidth, 50);
		});

		it("should calculate widths of the table columns correctly when using percentages", function () {
			const availableWidth = 149;
			const offsetTotal = 51;
			const columns: ColumnWidth[] = [
				{
					width: "50%",
					_minWidth: 22.27734375,
					_maxWidth: 22.27734375,
				},
				{
					width: "25%",
					_minWidth: 22.27734375,
					_maxWidth: 22.27734375,
				},
				{
					width: "25%",
					_minWidth: 22.27734375,
					_maxWidth: 22.27734375,
				},
			];
			const tableNode = {
				table: {
					widths: ["50%", "25%", "25%"],
					body: [[{ text: "50%" }, { text: "25%" }, { text: "25%" }]],
				},
				_layout: {
					vLineWidth: function (i: number) {
						if (i === 0) {
							return 4;
						}
						if (i === 1) {
							return 6;
						}
						if (i === 2) {
							return 5;
						}
						if (i === 3) {
							return 4;
						}
						return 0;
					},
					paddingLeft: function (i: number) {
						return i === 0 ? 5 : 3;
					},
					paddingRight: function () {
						return 7;
					},
				},
			} as unknown as PdfNode;

			ColumnCalculator.buildColumnWidths(columns, availableWidth, offsetTotal, tableNode);
			// 200 Total available width (availableWidth + offsetTotal) === 149 + 51
			// Fist column is 50% width of 200 === 100
			// 100 - 4 borderLeft - 6/2 = 3 borderRight - 5 paddingLeft - 7 paddingRight
			assert.equal(Number(columns[0].width), 81);
			// Second column has 25% width of 200 which is 50
			// 50 - 3 (6/2) borderLeft - 2.5 (5/2) borderRight - 3 paddingLeft - 7 paddingRight
			assert.equal(Number(columns[1].width), 34.5);
			// Third column has 25% width of 200 which is 50
			// 50 - 2.5 (5/2) borderLeft - 4 borderRight - 3 paddingLeft - 7 paddingRight
			assert.equal(Number(columns[2].width), 33.5);
			// The sum of all column width should be equal to totalAvailableWidth - offsetTotal
			assert.equal(availableWidth, 81 + 34.5 + 33.5);
		});
	});

	describe("measureMinMax", function () {
		it("uses the largest star measurements for every star column", function () {
			const result = ColumnCalculator.measureMinMax([
				{ width: "auto", _minWidth: 10, _maxWidth: 20 },
				{ width: "*", _minWidth: 15, _maxWidth: 30 },
				{ width: "star", _minWidth: 25, _maxWidth: 40 },
				{ width: 50, _minWidth: 60, _maxWidth: 70 },
			]);

			assert.deepEqual(result, { min: 110, max: 150 });
		});
	});
});
