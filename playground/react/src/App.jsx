import { useCallback, useEffect, useRef, useState } from "react";
import { generatePdf } from "./pdf-generator";
import { renderPdf } from "./pdf-preview";
import SampleSelect from "./SampleSelect";
import { getInitialSample, getInitialSource, getSampleSource, saveState } from "./samples";

const downloadBlob = (blob, filename) => {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
};

export default function App() {
	const [sample, setSample] = useState(getInitialSample);
	const [source, setSource] = useState(getInitialSource);
	const [status, setStatus] = useState("Ready");
	const [pdfBlob, setPdfBlob] = useState(null);
	const generation = useRef(0);
	const pdfContainer = useRef(null);

	const generate = useCallback(async () => {
		const currentGeneration = ++generation.current;
		const startedAt = performance.now();
		setStatus("Generating…");

		try {
			const blob = await generatePdf(source);
			if (currentGeneration !== generation.current) {
				return;
			}

			const rendered = await renderPdf({
				blob,
				container: pdfContainer.current,
				isCurrent: () => currentGeneration === generation.current,
			});
			if (!rendered) {
				return;
			}

			setPdfBlob(blob);
			setStatus(`Generated in ${(performance.now() - startedAt).toFixed(1)} ms`);
		} catch (error) {
			if (currentGeneration === generation.current) {
				console.error(error);
				setPdfBlob(null);
				setStatus(error instanceof Error ? error.message : "PDF generation failed");
			}
		}
	}, [source]);

	useEffect(() => {
		saveState(sample, source);
		const timer = window.setTimeout(() => void generate(), 400);
		return () => window.clearTimeout(timer);
	}, [generate, sample, source]);

	return (
		<div className="app">
			<header>
				<div className="identity">
					<strong>React playground</strong>
					<span>Runs entirely in the browser</span>
				</div>
				<SampleSelect
					value={sample}
					onChange={(nextSample) => {
						setSample(nextSample);
						setSource(getSampleSource(nextSample));
					}}
				/>
				<button type="button" onClick={() => void generate()}>
					Generate
				</button>
				<button
					type="button"
					disabled={!pdfBlob}
					onClick={() => downloadBlob(pdfBlob, `${sample}.pdf`)}
				>
					Download
				</button>
				<output title={status}>{status}</output>
			</header>
			<main>
				<label className="editor-pane">
					<span className="visually-hidden">Document definition</span>
					<textarea
						spellCheck={false}
						value={source}
						onChange={(event) => setSource(event.target.value)}
					/>
				</label>
				<div ref={pdfContainer} id="pdf-container" aria-label="Browser-generated PDF preview" />
			</main>
		</div>
	);
}
