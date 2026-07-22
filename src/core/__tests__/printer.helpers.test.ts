import { describe, expect, it } from "vitest";

import type { PdfPage } from "../../types/internal";
import { calculatePageHeight } from "../printer.helpers";

describe("calculatePageHeight", () => {
	it("uses absolute vector geometry without adding its y coordinate twice", () => {
		const page = {
			items: [{ type: "vector", item: { type: "rect", x: 0, y: 100, w: 20, h: 30 } }],
		} as PdfPage;

		expect(calculatePageHeight(page, { left: 10, top: 10, right: 10, bottom: 20 })).toBe(150);
	});
});
