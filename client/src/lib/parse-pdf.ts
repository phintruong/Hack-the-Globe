/** Extract all text from a PDF file, returned as a single string. */
export async function extractTextFromPdf(file: File): Promise<string> {
  // Dynamic import to avoid SSR issues — pdfjs-dist needs DOM APIs
  const pdfjs = await import("pdfjs-dist");

  // Use inline worker to avoid CDN/bundling issues
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n").trim();
}
