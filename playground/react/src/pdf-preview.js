import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

export const renderPdf = async ({ blob, container, isCurrent }) => {
	const loadingTask = getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
	const pdf = await loadingTask.promise;

	try {
		const pages = [];
		for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
			if (!isCurrent()) {
				return false;
			}

			const page = await pdf.getPage(pageNumber);
			const viewport = page.getViewport({ scale: 1.5 });
			const canvas = document.createElement("canvas");
			canvas.className = "pdf-page";
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			await page.render({
				canvas,
				canvasContext: canvas.getContext("2d"),
				viewport,
			}).promise;
			pages.push(canvas);
		}

		if (!isCurrent()) {
			return false;
		}

		container?.replaceChildren(...pages);
		return true;
	} finally {
		await loadingTask.destroy();
	}
};
