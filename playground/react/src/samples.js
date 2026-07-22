import { createSampleSource, sampleNames } from "../../shared/editor";

const SAMPLE_KEY = "pdfcraft.react.sample";
const SOURCE_KEY = "pdfcraft.react.source";

const rawSamples = import.meta.glob("../../shared/samples/*.json5", {
	eager: true,
	import: "default",
	query: "?raw",
});
const samples = Object.fromEntries(
	Object.entries(rawSamples).map(([filename, sample]) => [
		filename
			.split("/")
			.pop()
			.replace(/\.json5$/, ""),
		sample,
	]),
);

export const initialSample = "basics";
export const availableSamples = sampleNames;

export const getSampleSource = (name) => createSampleSource(samples[name]);

export const getInitialSample = () => {
	const stored = localStorage.getItem(SAMPLE_KEY);
	return availableSamples.includes(stored) ? stored : initialSample;
};

export const getInitialSource = () => {
	const sample = getInitialSample();
	const storedSample = localStorage.getItem(SAMPLE_KEY);
	const storedSource = localStorage.getItem(SOURCE_KEY);

	if (storedSample === sample && storedSource) {
		return storedSource;
	}

	return getSampleSource(sample);
};

export const saveState = (sample, source) => {
	localStorage.setItem(SAMPLE_KEY, sample);
	localStorage.setItem(SOURCE_KEY, source);
};
