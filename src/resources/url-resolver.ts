import type { AccessPolicy, ResourceHeaders, VirtualFileSystem } from "../types";

const MAX_REDIRECTS = 30;

const normalizeHeaders = (headers: ResourceHeaders): string => {
	const entries: Array<[string, string]> = [];
	if (Array.isArray(headers)) {
		for (const [key, value] of headers as ReadonlyArray<readonly [string, string]>) {
			entries.push([key.toLowerCase(), value]);
		}
	} else if (typeof (headers as { forEach?: unknown }).forEach === "function") {
		(headers as { forEach(callback: (value: string, key: string) => void): void }).forEach(
			(value, key) => entries.push([key.toLowerCase(), value]),
		);
	} else {
		for (const [key, value] of Object.entries(headers as Record<string, string>)) {
			entries.push([key.toLowerCase(), value]);
		}
	}
	return JSON.stringify(
		entries.sort(
			([leftKey, leftValue], [rightKey, rightValue]) =>
				leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
		),
	);
};

const getResourceKey = (url: string, headers: ResourceHeaders): string => {
	const normalizedHeaders = normalizeHeaders(headers);
	return normalizedHeaders === "[]"
		? url
		: `${url}#pdfcraft-headers=${encodeURIComponent(normalizedHeaders)}`;
};

/**
 * @param url
 * @param headers
 * @param urlAccessPolicy
 * @returns
 */
async function fetchUrl(
	url: string,
	headers: ResourceHeaders = {},
	urlAccessPolicy?: AccessPolicy,
): Promise<Response> {
	for (let i = 0; i <= MAX_REDIRECTS; i++) {
		if (typeof urlAccessPolicy !== "undefined" && (await urlAccessPolicy(url)) !== true) {
			throw new Error(`Access to URL denied by resource access policy: ${url}`);
		}

		try {
			let response = await fetch(url, { headers: headers as HeadersInit, redirect: "manual" });

			// redirect url
			if (response.status >= 300 && response.status < 400) {
				let location = response.headers.get("location");
				if (!location) {
					throw new Error("Redirect response missing Location header");
				}
				url = new URL(location, url).href;
				continue;
			}

			// browsers do not support redirect: 'manual'
			if (response.type === "opaqueredirect") {
				response = await fetch(url, { headers: headers as HeadersInit });
			}

			if (!response.ok) {
				throw new Error(`Failed to fetch (status code: ${response.status})`);
			}

			return response;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Network request failed (url: "${url}", error: ${message})`, {
				cause: error,
			});
		}
	}

	throw new Error(`Network request failed (url: "${url}", error: Too many redirects)`);
}

class URLResolver {
	private readonly fs: VirtualFileSystem;
	private readonly resolving: Record<string, Promise<void>> = {};
	private urlAccessPolicy?: AccessPolicy;

	constructor(fs: VirtualFileSystem) {
		this.fs = fs;
	}

	/**
	 * @param callback
	 */
	setUrlAccessPolicy(callback?: AccessPolicy): void {
		this.urlAccessPolicy = callback;
	}

	private queue(
		url: string,
		headers: ResourceHeaders = {},
	): { key: string; promise: Promise<void> } {
		const key = getResourceKey(url, headers);
		const resolveUrlInternal = async (): Promise<void> => {
			if (url.toLowerCase().startsWith("https://") || url.toLowerCase().startsWith("http://")) {
				if (this.fs.existsSync(key)) {
					return; // url was downloaded earlier
				}

				const response = await fetchUrl(url, headers, this.urlAccessPolicy);

				// validate access policy on redirected url (in browsers, only the final URL is validated)
				if (response.redirected) {
					if (
						typeof this.urlAccessPolicy !== "undefined" &&
						(await this.urlAccessPolicy(response.url)) !== true
					) {
						throw new Error(`Access to URL denied by resource access policy: ${response.url}`);
					}
				}

				const buffer = await response.arrayBuffer();
				this.fs.writeFileSync(key, buffer);
			}
			// else cannot be resolved
		};

		if (this.resolving[key] === undefined) {
			this.resolving[key] = resolveUrlInternal();
		}
		return { key, promise: this.resolving[key] };
	}

	resolve(url: string, headers: ResourceHeaders = {}): Promise<void> {
		return this.queue(url, headers).promise;
	}

	resolveReference(url: string, headers: ResourceHeaders = {}): string {
		return this.queue(url, headers).key;
	}

	async resolved(): Promise<void> {
		await Promise.all(Object.values(this.resolving));
	}
}

export default URLResolver;
