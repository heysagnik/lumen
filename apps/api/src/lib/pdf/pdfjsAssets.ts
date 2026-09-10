import { fileURLToPath } from "node:url";

const packageJsonUrl = import.meta.resolve("pdfjs-dist/package.json");
const packageRoot = fileURLToPath(new URL(".", packageJsonUrl));

export const standardFontDataUrl = `${packageRoot}standard_fonts/`;
export const cMapUrl = `${packageRoot}cmaps/`;
