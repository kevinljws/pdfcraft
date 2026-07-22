import pdfcraft = require("pdfcraft");

const instance = pdfcraft.createPdfCraft();
instance.createPdf({ content: ["CommonJS TypeScript consumer test"] });
