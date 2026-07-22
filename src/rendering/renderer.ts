import TextDecorator from "../text/text-decorator";
import TextInlines from "../text/text-inlines";
import type { Inline, LayoutPdfNode, LineLike, MeasuredPdfNode } from "../types/internal";
import { isNumber } from "../utils/variable-type";
import RendererGraphics from "./renderer.graphics";
import { offsetText } from "./renderer.helpers";
import type PDFDocument from "./pdf-document";
import type {
	ClipRectangle,
	EmbeddedFont,
	PageNodeReference,
	RenderablePage,
	RendererTextOptions,
	VerticalAlignmentItem,
} from "./renderer.types";

class Renderer {
	private readonly pdfDocument: PDFDocument;
	private readonly graphics: RendererGraphics;
	private readonly progressCallback: ((progress: number) => void) | undefined;
	private readonly outlineMap: Record<string, PDFKit.PDFOutline> = {};

	constructor(pdfDocument: PDFDocument, progressCallback?: (progress: number) => void) {
		this.pdfDocument = pdfDocument;
		this.graphics = new RendererGraphics(pdfDocument);
		this.progressCallback = progressCallback;
	}

	renderPages(pages: RenderablePage[]): void {
		this.pdfDocument._pdfCraftPages = pages;

		const totalItems = this.progressCallback
			? pages.reduce((total, page) => total + page.items.length, 0)
			: 0;
		let renderedItems = 0;

		for (const page of pages) {
			this.pdfDocument.addPage({ size: [page.pageSize.width, page.pageSize.height] });
			this.graphics.beginPage();

			for (const item of page.items) {
				if (item.type !== "vector") {
					this.graphics.prepareNonVectorItem();
				}

				switch (item.type) {
					case "vector":
						this.graphics.renderVector(item.item);
						break;
					case "line":
						this.renderLine(item.item, item.item.x ?? 0, item.item.y ?? 0);
						break;
					case "image":
						this.graphics.renderImage(item.item);
						break;
					case "svg":
						this.graphics.renderSVG(item.item);
						break;
					case "attachment":
						this.graphics.renderAttachment(item.item);
						break;
					case "beginClip":
						this.graphics.beginClip(item.item as ClipRectangle);
						break;
					case "endClip":
						this.graphics.endClip();
						break;
					case "beginVerticalAlignment":
						this.graphics.beginVerticalAlignment(item.item as VerticalAlignmentItem);
						break;
					case "endVerticalAlignment":
						this.graphics.endVerticalAlignment(item.item as VerticalAlignmentItem);
						break;
				}

				renderedItems++;
				this.progressCallback?.(renderedItems / totalItems);
			}

			this.graphics.endPage();

			if (page.watermark) {
				this.graphics.renderWatermark(page);
			}
		}
	}

	renderLine(line: LineLike, x: number, y: number): void {
		const preparePageNodeRefLine = (
			pageNodeRef: PageNodeReference | MeasuredPdfNode | LayoutPdfNode,
			inline: Inline,
		): void => {
			const positions = "positions" in pageNodeRef ? pageNodeRef.positions : undefined;
			if (positions === undefined) {
				throw new Error("Page reference id not found");
			}

			const pageNumber = positions[0]?.pageNumber;
			if (pageNumber === undefined) {
				throw new Error("Page reference position not found");
			}
			inline.text = pageNumber.toString();
			const newWidth = new TextInlines(null).widthOfText(inline.text, inline);
			const diffWidth = inline.width - newWidth;
			inline.width = newWidth;

			if (inline.alignment === "right") {
				inline.x += diffWidth;
			} else if (inline.alignment === "center") {
				inline.x += diffWidth / 2;
			}
		};

		if (line._outline) {
			let parentOutline = this.pdfDocument.outline;
			if (line._outline.parentId && this.outlineMap[line._outline.parentId]) {
				parentOutline = this.outlineMap[line._outline.parentId];
			}

			const outline = parentOutline.addItem(line._outline.text, {
				expanded: line._outline.expanded,
			});
			if (line._outline.id) {
				this.outlineMap[line._outline.id] = outline;
			}
		}

		if (line._pageNodeRef) {
			preparePageNodeRefLine(line._pageNodeRef, line.inlines[0]);
		}

		x ||= 0;
		y ||= 0;
		const lineHeight = line.getHeight();
		const descent = lineHeight - line.getAscenderHeight();
		const textDecorator = new TextDecorator(this.pdfDocument);

		textDecorator.drawBackground(line, x, y);

		for (let index = 0; index < line.inlines.length; index++) {
			const inline = line.inlines[index];
			const shiftToBaseline =
				lineHeight - (inline.font.ascender / 1000) * inline.fontSize - descent;

			if (inline._pageNodeRef) {
				preparePageNodeRefLine(inline._pageNodeRef, inline);
			}

			const options: RendererTextOptions = {
				lineBreak: false,
				textWidth: inline.width,
				characterSpacing: inline.characterSpacing,
				wordCount: 1,
				link: inline.link,
			};
			if (inline.linkToDestination) options.goTo = inline.linkToDestination;
			if (line.id && index === 0) options.destination = line.id;
			if (inline.fontFeatures) {
				options.features = inline.fontFeatures as PDFKit.Mixins.OpenTypeFeatures[];
			}

			this.pdfDocument.opacity(isNumber(inline.opacity) ? inline.opacity : 1);
			this.pdfDocument.fill(this.pdfDocument.resolveColor(inline.color, "black"));
			this.pdfDocument._font = inline.font as EmbeddedFont;
			this.pdfDocument.fontSize(inline.fontSize);

			const shiftedY = offsetText(y + shiftToBaseline, inline);
			this.pdfDocument.text(inline.text, x + inline.x, shiftedY, options);

			if (inline.linkToPage) {
				const action = this.pdfDocument.ref({
					Type: "Action",
					S: "GoTo",
					D: [inline.linkToPage, 0, 0],
				});
				(action.end as () => void)();
				this.pdfDocument.annotate(x + inline.x, shiftedY, inline.width, inline.height, {
					Subtype: "Link",
					Dest: [inline.linkToPage - 1, "XYZ", null, null, null],
				} as PDFKit.Mixins.AnnotationOption);
			}
		}

		textDecorator.drawDecorations(line, x, y);
	}
}

export default Renderer;
