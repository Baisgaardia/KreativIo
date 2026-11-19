import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedDocument {
  title: string;
  text: string;
  format: string;
}

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'log', 'rtf']);
const HTML_EXTENSIONS = new Set(['html', 'htm']);

function stripHtmlToText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = '';
    const lines: string[] = [];

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const textItem = item as { str: string; transform?: number[]; hasEOL?: boolean };
      const y = textItem.transform ? textItem.transform[5] : null;

      if (lastY !== null && y !== null && Math.abs(y - lastY) > 6) {
        if (line.trim()) lines.push(line.trim());
        line = textItem.str;
      } else {
        line += (line && textItem.str && !line.endsWith(' ') && !textItem.str.startsWith(' ') ? ' ' : '') + textItem.str;
      }

      if (textItem.hasEOL) {
        if (line.trim()) lines.push(line.trim());
        line = '';
        lastY = null;
      } else {
        lastY = y;
      }
    }
    if (line.trim()) lines.push(line.trim());
    pageTexts.push(lines.join('\n'));
  }

  return pageTexts.join('\n\n').trim();
}

export async function parseUploadedFile(file: File): Promise<ParsedDocument> {
  const name = file.name;
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf') {
    const buffer = await file.arrayBuffer();
    const text = await extractPdfText(buffer);
    if (!text) {
      throw new Error(`Der blev ikke fundet markerbar tekst i "${name}". Indscannede billed-PDF'er understøttes ikke.`);
    }
    return { title: name, text, format: 'PDF' };
  }

  if (ext === 'docx') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!text) {
      throw new Error(`Filen "${name}" ser ud til at være tom eller indeholder ingen læsbar tekst.`);
    }
    return { title: name, text, format: 'DOCX' };
  }

  if (HTML_EXTENSIONS.has(ext)) {
    const raw = await file.text();
    const text = stripHtmlToText(raw);
    return { title: name, text, format: 'HTML' };
  }

  if (TEXT_EXTENSIONS.has(ext) || file.type.startsWith('text/')) {
    const raw = await file.text();
    const text = raw.replace(/\r\n/g, '\n').trim();
    if (!text) {
      throw new Error(`Filen "${name}" er tom.`);
    }
    return { title: name, text, format: ext.toUpperCase() || 'TEXT' };
  }

  throw new Error(
    `Filformatet ".${ext || 'ukendt'}" understøttes ikke. Upload venligst en .txt-, .md-, .docx-, .pdf-, .html- eller .csv-fil.`
  );
}
