import TextBreaker from "./text-breaker";
import StyleContextStack from "../layout/style-context-stack";
import { isObject } from "../utils/variable-type";
import type { Inline, MeasuredPdfNode } from "../types/internal";
import type {
	BrokenInline,
	InlineMeasurement,
	TextFontProvider,
	TextFragment,
	TextSize,
} from "./text.types";

const LEADING = /^(\s)+/g;
const TRAILING = /(\s)+$/g;

/**
 * @param array
 * @returns
 */
const flattenTextArray = (input: TextFragment | TextFragment[]): TextFragment[] => {
	const combineStyles = (parent: unknown, child: unknown): unknown => {
		if (parent === undefined) return child;
		if (child === undefined) return parent;
		return [parent, child].flat();
	};

	function flatten(
		value: TextFragment | TextFragment[],
		inheritedStyle: Record<string, unknown> = {},
	): TextFragment[] {
		if (Array.isArray(value)) {
			return value.flatMap((item) => flatten(item, inheritedStyle));
		}
		if (isObject(value) && Array.isArray(value.text)) {
			const ownStyle = StyleContextStack.copyStyle(value);
			const nestedStyle = { ...inheritedStyle, ...ownStyle };
			nestedStyle.style = combineStyles(inheritedStyle.style, ownStyle.style);
			return flatten(value.text as TextFragment[], nestedStyle);
		}
		if (Object.keys(inheritedStyle).length === 0) return [value];
		if (isObject(value)) {
			const leaf = value as Record<string, unknown>;
			return [
				{
					...inheritedStyle,
					...leaf,
					style: combineStyles(inheritedStyle.style, leaf.style),
				} as TextFragment,
			];
		}
		return [{ ...inheritedStyle, text: value } as TextFragment];
	}

	return flatten(input);
};

/**
 * Text measurement utility
 */
class TextInlines {
	declare pdfDocument: TextFontProvider | null;
	private readonly measureInlineImage?: (node: MeasuredPdfNode) => MeasuredPdfNode;

	/**
	 * @param pdfDocument object is instance of PDFDocument
	 */
	constructor(
		pdfDocument: TextFontProvider | null,
		measureInlineImage?: (node: MeasuredPdfNode) => MeasuredPdfNode,
	) {
		this.pdfDocument = pdfDocument;
		this.measureInlineImage = measureInlineImage;
	}

	/**
	 * Converts an array of strings (or inline-definition-objects) into a collection
	 * of inlines and calculated minWidth/maxWidth and their min/max widths
	 *
	 * @param textArray an array of inline-definition-objects (or strings)
	 * @param styleContextStack current style stack
	 * @returns collection of inlines, minWidth, maxWidth
	 */
	buildInlines(
		textArray: TextFragment | TextFragment[],
		styleContextStack = new StyleContextStack(null),
	): InlineMeasurement {
		const getTrimmedWidth = (item: {
			width: number;
			leadingCut: number;
			trailingCut: number;
		}): number => {
			return Math.max(0, item.width - item.leadingCut - item.trailingCut);
		};

		let minWidth = 0;
		let maxWidth = 0;
		let currentLineWidth: {
			width: number;
			leadingCut: number;
			trailingCut: number;
		} | null = null;

		let flattenedTextArray = flattenTextArray(textArray);

		const textBreaker = new TextBreaker();
		let brokenText = textBreaker.getBreaks(flattenedTextArray, styleContextStack);

		let measuredText = this.measure(brokenText, styleContextStack);

		measuredText.forEach((inline) => {
			minWidth = Math.max(minWidth, getTrimmedWidth(inline));

			if (!currentLineWidth) {
				currentLineWidth = { width: 0, leadingCut: inline.leadingCut, trailingCut: 0 };
			}

			currentLineWidth.width += inline.width;
			currentLineWidth.trailingCut = inline.trailingCut;

			maxWidth = Math.max(maxWidth, getTrimmedWidth(currentLineWidth));

			if (inline.lineEnd) {
				currentLineWidth = null;
			}
		});

		if (StyleContextStack.getStyleProperty({}, styleContextStack, "noWrap", false)) {
			minWidth = maxWidth;
		}

		return {
			items: measuredText,
			minWidth: minWidth,
			maxWidth: maxWidth,
		};
	}

	measure(array: BrokenInline[], styleContextStack: StyleContextStack): Inline[] {
		if (array.length) {
			let leadingIndent = StyleContextStack.getStyleProperty(
				array[0],
				styleContextStack,
				"leadingIndent",
				0,
			);
			if (leadingIndent) {
				array[0].leadingCut = -leadingIndent;
				array[0].leadingIndent = leadingIndent;
			}
		}

		const pdfDocument = this.requirePdfDocument();
		const measured: Inline[] = [];
		array.forEach((item) => {
			const textStyle = this.resolveTextStyle(item, styleContextStack);
			const isMediaInline = item.image !== undefined || item.acroform !== undefined;
			const requestedImageWidth = isMediaInline && typeof item.width === "number" ? item.width : 0;
			const requestedImageHeight =
				isMediaInline && typeof item.height === "number" ? item.height : 0;
			const inline: Inline = Object.assign(item, {
				font: pdfDocument.provideFont(textStyle.fontName, textStyle.bold, textStyle.italics),
				fontSize: textStyle.fontSize,
				width: requestedImageWidth,
				height: requestedImageHeight,
				x: 0,
				leadingCut: typeof item.leadingCut === "number" ? item.leadingCut : 0,
				trailingCut: 0,
			});

			inline.alignment = StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"alignment",
				"left",
			);
			inline.fontFeatures = textStyle.fontFeatures;
			inline.characterSpacing = textStyle.characterSpacing;
			inline.color = StyleContextStack.getStyleProperty(item, styleContextStack, "color", "black");
			inline.decoration = StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"decoration",
				null,
			);
			inline.decorationColor = StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"decorationColor",
				null,
			);
			inline.decorationStyle = StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"decorationStyle",
				null,
			);
			inline.decorationThickness = StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"decorationThickness",
				null,
			);
			inline.background = StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"background",
				null,
			);
			inline.link = StyleContextStack.getStyleProperty(item, styleContextStack, "link", null);
			inline.linkToPage = StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"linkToPage",
				null,
			);
			inline.linkToDestination = StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"linkToDestination",
				null,
			);
			inline.noWrap = inline.acroform
				? true
				: StyleContextStack.getStyleProperty(item, styleContextStack, "noWrap", null);
			inline.opacity = StyleContextStack.getStyleProperty(item, styleContextStack, "opacity", 1);
			inline.sup = StyleContextStack.getStyleProperty(item, styleContextStack, "sup", false);
			inline.sub = StyleContextStack.getStyleProperty(item, styleContextStack, "sub", false);

			if (inline.sup || inline.sub) {
				// font size reduction taken from here: https://en.wikipedia.org/wiki/Subscript_and_superscript#Desktop_publishing
				inline.fontSize *= 0.58;
			}

			if (inline.image !== undefined) {
				if (!this.measureInlineImage) {
					throw new Error("Inline image measurement is unavailable");
				}
				const measuredImage = this.measureInlineImage(inline as unknown as MeasuredPdfNode);
				inline.image = measuredImage.image as string;
				inline.width = inline._imageWidth = measuredImage._width ?? 0;
				inline.height = inline._imageHeight = measuredImage._height ?? 0;
			} else if (inline.acroform !== undefined) {
				inline.width = typeof item.width === "number" ? item.width : 25;
				inline.height = typeof item.height === "number" ? item.height : 15;
			} else {
				inline.width = this.widthOfText(inline.text, inline);
				inline.height = inline.font.lineHeight(inline.fontSize) * textStyle.lineHeight;
			}
			inline.x = 0;

			if (!inline.leadingCut) {
				inline.leadingCut = 0;
			}

			let preserveLeadingSpaces = StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"preserveLeadingSpaces",
				false,
			);
			if (!preserveLeadingSpaces) {
				let leadingSpaces = !isMediaInline ? inline.text.match(LEADING) : null;
				if (leadingSpaces) {
					inline.leadingCut += this.widthOfText(leadingSpaces[0], inline);
				}
			}

			inline.trailingCut = 0;

			let preserveTrailingSpaces = StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"preserveTrailingSpaces",
				false,
			);
			if (!preserveTrailingSpaces) {
				let trailingSpaces = !isMediaInline ? inline.text.match(TRAILING) : null;
				if (trailingSpaces) {
					inline.trailingCut = this.widthOfText(trailingSpaces[0], inline);
				}
			}

			measured.push(inline);
		}, this);

		return measured;
	}

	/**
	 * Width of text
	 *
	 * @param text
	 * @param inline
	 * @returns
	 */
	widthOfText(
		text: string,
		inline: Pick<Inline, "font" | "fontSize"> & {
			fontFeatures?: unknown;
			characterSpacing?: number;
		},
	): number {
		return (
			inline.font.widthOfString(text, inline.fontSize, inline.fontFeatures) +
			(inline.characterSpacing || 0) * (text.length - 1)
		);
	}

	/**
	 * Returns size of the specified string (without breaking it) using the current style
	 *
	 * @param text text to be measured
	 * @param styleContextStack current style stack
	 * @returns size of the specified string
	 */
	sizeOfText(text: string, styleContextStack: StyleContextStack): TextSize {
		const textStyle = this.resolveTextStyle({}, styleContextStack);
		const font = this.requirePdfDocument().provideFont(
			textStyle.fontName,
			textStyle.bold,
			textStyle.italics,
		);

		return {
			width: this.widthOfText(text, {
				font,
				fontSize: textStyle.fontSize,
				characterSpacing: textStyle.characterSpacing,
				fontFeatures: textStyle.fontFeatures,
			}),
			height: font.lineHeight(textStyle.fontSize) * textStyle.lineHeight,
			fontSize: textStyle.fontSize,
			lineHeight: textStyle.lineHeight,
			ascender: (font.ascender / 1000) * textStyle.fontSize,
			descender: (font.descender / 1000) * textStyle.fontSize,
		};
	}

	private resolveTextStyle(item: object, styleContextStack: StyleContextStack) {
		return {
			fontName: StyleContextStack.getStyleProperty(item, styleContextStack, "font", "Roboto"),
			fontSize: StyleContextStack.getStyleProperty(item, styleContextStack, "fontSize", 12),
			fontFeatures: StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"fontFeatures",
				null,
			),
			bold: StyleContextStack.getStyleProperty(item, styleContextStack, "bold", false),
			italics: StyleContextStack.getStyleProperty(item, styleContextStack, "italics", false),
			lineHeight: StyleContextStack.getStyleProperty(item, styleContextStack, "lineHeight", 1),
			characterSpacing: StyleContextStack.getStyleProperty(
				item,
				styleContextStack,
				"characterSpacing",
				0,
			),
		};
	}

	/**
	 * Returns size of the specified rotated string (without breaking it) using the current style
	 *
	 * @param text text to be measured
	 * @param angle
	 * @param styleContextStack current style stack
	 * @returns size of the specified string
	 */
	sizeOfRotatedText(
		text: string,
		angle: number,
		styleContextStack: StyleContextStack,
	): { width: number; height: number } {
		let angleRad = (angle * Math.PI) / -180;
		let size = this.sizeOfText(text, styleContextStack);
		return {
			width: Math.abs(size.height * Math.sin(angleRad)) + Math.abs(size.width * Math.cos(angleRad)),
			height:
				Math.abs(size.width * Math.sin(angleRad)) + Math.abs(size.height * Math.cos(angleRad)),
		};
	}

	private requirePdfDocument(): TextFontProvider {
		if (!this.pdfDocument) {
			throw new Error("A PDF document is required for text measurement");
		}
		return this.pdfDocument;
	}
}

export default TextInlines;
