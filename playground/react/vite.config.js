import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: directory,
	plugins: [react()],
	server: {
		port: Number(process.env.PORT) || 1235,
		fs: {
			allow: [path.resolve(directory, "../..")],
		},
	},
});
