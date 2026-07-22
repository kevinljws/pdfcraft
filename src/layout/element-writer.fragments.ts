import type { PageItem } from "../types/internal";
import { getPageItemBottom } from "./page-item-geometry";

export function getFragmentHeight(items: PageItem[], cursorY: number): number {
	return Math.max(cursorY, ...items.map(getPageItemBottom));
}
