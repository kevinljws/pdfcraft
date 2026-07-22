export const sampleNames = [
	"basics",
	"named-styles",
	"inline-styling",
	"style-overrides",
	"columns",
	"tables",
	"lists",
	"margins",
	"images",
	"svgs",
	"attachments",
	"invoice",
];

export const createSampleSource = (sample) => {
	return `// Assign the document definition to a variable named dd.

var dd = ${sample.trim()};
`;
};

export const parseDocumentDefinition = (source) => {
	// The playground intentionally executes locally edited document definitions.
	return new Function(`"use strict";\n${source}\nreturn dd;`)();
};
