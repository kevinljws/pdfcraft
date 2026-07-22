import type { VfsEncoding, VirtualFileSystem as VirtualFileSystemContract } from "../types";
import { decodeBytes, encodeBytes } from "../utils/bytes";

const normalizeFilename = (filename: string): string => {
	if (filename.indexOf("/") === 0) {
		filename = filename.substring(1);
	}

	return filename;
};

class VirtualFileSystem implements VirtualFileSystemContract {
	private readonly storage: Record<string, Uint8Array> = {};

	/**
	 * @param filename
	 * @returns
	 */
	existsSync(filename: string): boolean {
		const normalizedFilename = normalizeFilename(filename);
		return typeof this.storage[normalizedFilename] !== "undefined";
	}

	/**
	 * @param filename
	 * @param options
	 * @returns
	 */
	readFileSync(
		filename: string,
		options?: VfsEncoding | { encoding?: VfsEncoding },
	): string | Uint8Array {
		const normalizedFilename = normalizeFilename(filename);
		const encoding = typeof options === "object" ? options.encoding : options;

		if (!this.existsSync(normalizedFilename)) {
			throw new Error(`File '${normalizedFilename}' not found in virtual file system`);
		}

		const buffer = this.storage[normalizedFilename]!;
		if (encoding) {
			return decodeBytes(buffer, encoding);
		}

		return buffer;
	}

	/**
	 * @param filename
	 * @param content
	 * @param options
	 */
	writeFileSync(
		filename: string,
		content: string | ArrayBuffer | ArrayBufferView,
		options?: VfsEncoding | { encoding?: VfsEncoding },
	): void {
		const normalizedFilename = normalizeFilename(filename);
		const encoding = typeof options === "object" ? options.encoding : options;

		if (typeof content === "string") {
			this.storage[normalizedFilename] = encodeBytes(content, encoding);
		} else if (ArrayBuffer.isView(content)) {
			this.storage[normalizedFilename] = new Uint8Array(
				content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
			);
		} else {
			this.storage[normalizedFilename] = new Uint8Array(content.slice(0));
		}
	}
}

export { VirtualFileSystem };
