import type DocumentContext from "../document/document-context";
import type { CurrentPosition, LayoutPdfNode, Vector } from "../types/internal";
import { addPageItem, alignCanvas, alignImage } from "./element-writer.helpers";

type AddVector = (
	vector: Vector,
	ignoreContextX?: boolean,
	ignoreContextY?: boolean,
	index?: number,
	forcePage?: number,
) => CurrentPosition | undefined;

class ElementWriterMedia {
	constructor(
		private readonly context: () => DocumentContext,
		private readonly getCurrentPositionOnPage: () => CurrentPosition,
		private readonly addVector: AddVector,
	) {}

	private mediaFitsCurrentPage(node: LayoutPdfNode, height: number): boolean {
		const context = this.context();
		const page = context.getCurrentPage();

		return Boolean(
			page &&
			(node.absolutePosition !== undefined ||
				context.availableHeight >= height ||
				page.items.length === 0),
		);
	}

	addImage(image: LayoutPdfNode, index?: number): CurrentPosition | false {
		const height = image._height ?? 0;
		let context = this.context();
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (!this.mediaFitsCurrentPage(image, height)) {
			return false;
		}

		if (image._x === undefined) {
			image._x = image.x || 0;
		}

		image.x = context.x + image._x;
		image.y = context.y;

		this.alignImage(image);

		addPageItem(
			page,
			{
				type: "image",
				item: image,
			},
			index,
		);

		context.moveDown(height);

		return position;
	}

	addCanvas(node: LayoutPdfNode, index?: number): false | Array<CurrentPosition | undefined> {
		let context = this.context();
		let page = context.getCurrentPage();
		const positions: Array<CurrentPosition | undefined> = [];
		let height = node._minHeight ?? 0;

		if (
			!page ||
			(node.absolutePosition === undefined &&
				context.availableHeight < height &&
				page.items.length > 0)
		) {
			return false;
		}

		this.alignCanvas(node);

		node.canvas?.forEach(function (this: ElementWriterMedia, vector: Vector): void {
			let position = this.addVector(vector, false, false, index);
			positions.push(position);
			if (index !== undefined) {
				index++;
			}
		}, this);

		context.moveDown(height);

		return positions;
	}

	addSVG(image: LayoutPdfNode, index?: number): CurrentPosition | false {
		const height = image._height ?? 0;
		let context = this.context();
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (!this.mediaFitsCurrentPage(image, height)) {
			return false;
		}

		if (image._x === undefined) {
			image._x = image.x || 0;
		}

		image.x = context.x + image._x;
		image.y = context.y;

		this.alignImage(image);

		addPageItem(
			page,
			{
				type: "svg",
				item: image,
			},
			index,
		);

		context.moveDown(height);

		return position;
	}

	addQr(qr: LayoutPdfNode, index?: number): CurrentPosition | false {
		const height = qr._height ?? 0;
		let context = this.context();
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (!page || (qr.absolutePosition === undefined && context.availableHeight < height)) {
			return false;
		}

		if (qr._x === undefined) {
			qr._x = qr.x || 0;
		}

		qr.x = context.x + qr._x;
		qr.y = context.y;

		this.alignImage(qr);

		const canvas = qr._canvas ?? [];
		for (let i = 0, l = canvas.length; i < l; i++) {
			let vector = canvas[i];
			vector.x = (vector.x ?? 0) + qr.x;
			vector.y = (vector.y ?? 0) + qr.y;
			this.addVector(vector, true, true, index);
		}

		context.moveDown(height);

		return position;
	}

	addAttachment(attachment: LayoutPdfNode, index?: number): CurrentPosition | false {
		const height = attachment._height ?? 0;
		let context = this.context();
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (
			!page ||
			(attachment.absolutePosition === undefined &&
				context.availableHeight < height &&
				page.items.length > 0)
		) {
			return false;
		}

		if (attachment._x === undefined) {
			attachment._x = attachment.x || 0;
		}

		attachment.x = context.x + attachment._x;
		attachment.y = context.y;

		addPageItem(
			page,
			{
				type: "attachment",
				item: attachment,
			},
			index,
		);

		context.moveDown(height);

		return position;
	}

	alignImage(image: LayoutPdfNode): void {
		alignImage(image, this.context().availableWidth);
	}

	alignCanvas(node: LayoutPdfNode): void {
		alignCanvas(node, this.context().availableWidth);
	}
}

export default ElementWriterMedia;
