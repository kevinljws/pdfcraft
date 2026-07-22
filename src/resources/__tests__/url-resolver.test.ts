import { afterEach, describe, expect, it, vi } from "vitest";

import URLResolver from "../url-resolver";
import { VirtualFileSystem } from "../virtual-file-system";

describe("URLResolver", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("downloads each URL once and stores it in the VFS", async () => {
		const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
		vi.stubGlobal("fetch", fetchMock);
		const fileSystem = new VirtualFileSystem();
		const resolver = new URLResolver(fileSystem);
		const url = "https://assets.example.com/font.ttf";

		await Promise.all([resolver.resolve(url), resolver.resolve(url)]);

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fileSystem.readFileSync(url)).toEqual(Uint8Array.from([1, 2, 3]));
	});

	it("checks the access policy before fetching", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const resolver = new URLResolver(new VirtualFileSystem());
		resolver.setUrlAccessPolicy(() => false);

		await expect(resolver.resolve("https://blocked.example.com/file")).rejects.toThrow(
			"Access to URL denied by resource access policy",
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("keeps responses with different request headers in separate cache entries", async () => {
		const fetchMock = vi.fn(
			async (_url: string, options?: RequestInit) =>
				new Response(
					new TextEncoder().encode(new Headers(options?.headers).get("authorization") ?? ""),
				),
		);
		vi.stubGlobal("fetch", fetchMock);
		const fileSystem = new VirtualFileSystem();
		const resolver = new URLResolver(fileSystem);
		const url = "https://assets.example.com/private.ttf";

		const first = resolver.resolveReference(url, { Authorization: "Bearer first" });
		const second = resolver.resolveReference(url, { Authorization: "Bearer second" });
		await resolver.resolved();

		expect(first).not.toBe(second);
		expect(fileSystem.readFileSync(first, "utf8")).toBe("Bearer first");
		expect(fileSystem.readFileSync(second, "utf8")).toBe("Bearer second");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
