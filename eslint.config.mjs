import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
	js.configs.recommended,

	{
		files: ["**/*.{js,jsx,cjs,ts,cts,mts}"],

		languageOptions: {
			parser: tseslint.parser,
			globals: globals.es2021,

			ecmaVersion: "latest",
			sourceType: "module",
		},

		rules: {
			semi: 2,
			"no-unused-vars": [2, { args: "none" }],
			"no-throw-literal": 2,
			"no-prototype-builtins": 0,
		},
	},

	{
		files: [
			"examples/**/*.js",
			"playground/react/vite.config.js",
			"playground/server/server.js",
			"src/**/*.test.ts",
			"tests/integration/**/*.ts",
			"*.config.mts",
		],
		languageOptions: {
			globals: globals.node,
		},
	},

	{
		files: [
			"playground/react/**/*.{js,jsx}",
			"playground/server/public/**/*.js",
			"tests/browser/**/*.{js,ts}",
		],
		ignores: ["playground/react/vite.config.js"],
		languageOptions: {
			globals: globals.browser,
		},
	},

	{
		files: ["**/*.{ts,cts,mts}"],
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["tests/types/*.{cts,ts}"],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			"@typescript-eslint": tseslint.plugin,
		},
		rules: {
			"no-undef": 0,
			"no-unused-vars": 0,
			"@typescript-eslint/await-thenable": 2,
			"@typescript-eslint/consistent-type-imports": [2, { fixStyle: "inline-type-imports" }],
			"@typescript-eslint/no-floating-promises": 2,
			"@typescript-eslint/no-explicit-any": 2,
			"@typescript-eslint/no-misused-promises": 2,
			"@typescript-eslint/no-unused-vars": [2, { args: "none" }],
		},
	},

	{
		files: ["tests/types/**/*.{ts,cts}"],
		rules: {
			"@typescript-eslint/no-floating-promises": 0,
		},
	},

	{
		files: ["**/*.cjs"],
		languageOptions: {
			sourceType: "commonjs",
			globals: globals.node,
		},
	},
];
