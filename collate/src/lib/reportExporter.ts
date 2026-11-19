import { jsPDF } from 'jspdf';
import type {
  AnswerKeyComparisonResult,
  BatchComparisonResult,
  ComparisonOptions,
  DirectComparisonResult,
  SimilarityMatch,
} from './similarityEngine';

function fmtPct(val: number): string {
  return String(val).replace('.', ',') + ' %';
}

function safePdfText(input: string): string {
  return input
    .replace(/↔/g, '<->')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/…/g, '...')
    .replace(/\u00a0/g, ' ')
    // Strip characters outside Latin-1 / WinAnsi so built-in PDF fonts never garble
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

export function exportPdfReport(
  result: DirectComparisonResult | AnswerKeyComparisonResult | BatchComparisonResult,
  titles: { docA?: string; docB?: string; answerKey?: string },
  options: ComparisonOptions
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 18;
  let y = 18;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > bottomLimit) {
      doc.addPage();
      y = 18;
    }
  };

  const drawWrapped = (
    text: string,
    x: number,
    maxWidth: number,
    lineHeight: number,
    fontSize: number,
    style: 'normal' | 'bold' = 'normal',
    color: [number, number, number] = [30, 41, 59]
  ) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(safePdfText(text), maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, x, y);
      y += lineHeight;
    }
  };

  // Report Header
  const today = new Date().toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const modeLabel =
    result.mode === 'direct'
      ? 'Tilstand: Dokument mod dokument'
      : result.mode === 'answer_key'
      ? 'Tilstand: To besvarelser mod facit'
      : 'Tilstand: Holdscanning (batch-vurdering)';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42);
  doc.text('Collate - Plagiat- og lighedsrapport', marginX, y);
  y += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    safePdfText(
      `${modeLabel}  |  Genereret: ${today}  |  Mindste frase: ${options.minPhraseWords} ord (${
        options.includeParaphrases ? 'Ordret & omskrivning' : 'Kun ordret'
      })`
    ),
    marginX,
    y
  );
  y += 4;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 7;

  // Helper to draw summary box
  const drawSummaryRows = (rows: Array<[string, string]>) => {
    const boxHeight = rows.length * 6.2 + 6;
    ensureSpace(boxHeight + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, y, contentWidth, boxHeight, 2, 2, 'FD');

    let rowY = y + 6;
    for (const [label, value] of rows) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(safePdfText(label), marginX + 4, rowY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const valLines = doc.splitTextToSize(safePdfText(value), contentWidth - 68) as string[];
      doc.text(valLines[0] || '', marginX + 64, rowY);
      rowY += 6.2;
    }
    y += boxHeight + 7;
  };

  const drawMatchesSection = (
    heading: string,
    matches: SimilarityMatch[],
    labelA: string,
    labelB: string,
    showKeyOverlap: boolean
  ) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(safePdfText(heading), marginX, y);
    y += 5.5;

    if (matches.length === 0) {
      drawWrapped(
        'Ingen passager opfyldte de valgte kriterier.',
        marginX,
        contentWidth,
        5,
        9.5,
        'normal',
        [100, 116, 139]
      );
      y += 3;
      return;
    }

    for (const m of matches) {
      const isKey = m.classification === 'matches_answer_key';
      const isExact = m.kind === 'exact';
      const badgeText = isKey
        ? 'Matcher facit'
        : isExact
        ? 'Unik - Ordret'
        : 'Unik - Omskrivning';
      const badgeColor: [number, number, number] = isKey
        ? [22, 101, 52]
        : isExact
        ? [153, 27, 27]
        : [146, 64, 14];
      const badgeBg: [number, number, number] = isKey
        ? [220, 252, 231]
        : isExact
        ? [254, 226, 226]
        : [254, 243, 199];

      ensureSpace(26);

      // Match Header Strip
      doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
      doc.roundedRect(marginX, y - 3.5, 42, 5.2, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.text(safePdfText(`${m.label}  ${badgeText}`), marginX + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const metaStr = showKeyOverlap
        ? `${m.spanA.wordCount} ord  |  Lighed: ${fmtPct(m.similarityPct)}  |  Facit-overlap: ${m.answerKeyOverlapPct} %`
        : `${m.spanA.wordCount} ord  |  Lighed: ${fmtPct(m.similarityPct)}`;
      doc.text(safePdfText(metaStr), marginX + 46, y);
      y += 5;

      // Excerpt A
      drawWrapped(
        `${labelA}: "${m.spanA.text}"`,
        marginX + 3,
        contentWidth - 6,
        4.3,
        8.8,
        'normal',
        [30, 41, 59]
      );
      y += 1.2;

      // Excerpt B (only print separately if different or near-match, or print both for clarity)
      drawWrapped(
        `${labelB}: "${m.spanB.text}"`,
        marginX + 3,
        contentWidth - 6,
        4.3,
        8.8,
        'normal',
        [51, 65, 85]
      );

      y += 2;
      ensureSpace(3);
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.25);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 5;
    }
  };

  if (result.mode === 'direct') {
    drawSummaryRows([
      ['Dokument A (Mål):', `${titles.docA || 'Dokument A'} (${result.tokensA.length} ord)`],
      ['Dokument B (Reference):', `${titles.docB || 'Dokument B'} (${result.tokensB.length} ord)`],
      ['Lighed i Dokument A:', `${fmtPct(result.similarityPctA)} (${result.matchedWordsA} ord matchet)`],
      ['Overlap i Dokument B:', `${fmtPct(result.similarityPctB)} (${result.matchedWordsB} ord matchet)`],
      ['Unikke ligheder fundet:', `${result.matches.length} (${result.exactCount} ordret, ${result.paraphraseCount} omskrivning)`],
    ]);

    drawMatchesSection(
      'Unikke ligheder',
      result.matches,
      'Dokument A',
      'Dokument B',
      false
    );
  } else if (result.mode === 'answer_key') {
    drawSummaryRows([
      ['Besvarelse A:', `${titles.docA || 'Besvarelse A'} (${result.tokensA.length} ord)`],
      ['Besvarelse B:', `${titles.docB || 'Besvarelse B'} (${result.tokensB.length} ord)`],
      ['Facit / rettevejledning:', `${titles.answerKey || 'Facit'} (${result.tokensKey.length} ord)`],
      ['Unik lighed (Besvarelse A):', `${fmtPct(result.uniqueSimilarityPctA)} (${result.uniqueMatchedWordsA} ord uden for facit)`],
      ['Unik lighed (Besvarelse B):', `${fmtPct(result.uniqueSimilarityPctB)} (${result.uniqueMatchedWordsB} ord uden for facit)`],
      ['Facit-dækning / frasorteret:', `A: ${fmtPct(result.answerCoveragePctA)} | B: ${fmtPct(result.answerCoveragePctB)} | ${result.filteredOverlapCount} frasorteret`],
    ]);

    drawMatchesSection(
      'Unikke ligheder uden for facit',
      result.uniqueMatches,
      'Besvarelse A',
      'Besvarelse B',
      true
    );

    if (result.expectedMatches.length > 0) {
      drawMatchesSection(
        'Frasorterede overlap (matcher facit)',
        result.expectedMatches,
        'Besvarelse A',
        'Besvarelse B',
        true
      );
    }
  } else {
    // Batch Mode
    const summaryRows: Array<[string, string]> = [
      ['Besvarelser i holdet:', `${result.docStats.length} filer (${result.totalPairs} par sammenlignet)`],
      ['Par med unik lighed:', `${result.flaggedPairCount} par`],
      ['Højeste par-lighed:', `${fmtPct(result.highestPairPct)} (${result.highestPairLabel})`],
      ['Længste fælles passage:', `${result.longestSpanWords} ord`],
    ];
    if (result.usedAnswerKey) {
      summaryRows.push(['Valgfrit facit anvendt:', titles.answerKey || 'Facit']);
    }
    drawSummaryRows(summaryRows);

    // Ranked pairs table
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Rangerede par med unik lighed', marginX, y);
    y += 5.5;

    const flaggedPairs = result.pairs.filter((p) => p.uniqueMatchCount > 0);
    if (flaggedPairs.length === 0) {
      drawWrapped(
        'Ingen par havde unikke ligheder over den valgte tærskel.',
        marginX,
        contentWidth,
        5,
        9.5,
        'normal',
        [100, 116, 139]
      );
    } else {
      // Table header
      ensureSpace(8);
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, y - 3.8, contentWidth, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(71, 85, 105);
      doc.text('Par', marginX + 2, y);
      doc.text('Maks lighed', marginX + 114, y);
      doc.text('Passager', marginX + 140, y);
      doc.text('Længste', marginX + 162, y);
      y += 5.5;

      for (const p of flaggedPairs) {
        ensureSpace(7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        const pairTitle = safePdfText(`${p.docATitle} <-> ${p.docBTitle}`);
        const truncated = pairTitle.length > 56 ? pairTitle.slice(0, 53) + '...' : pairTitle;
        doc.text(truncated, marginX + 2, y);

        doc.setFont('helvetica', 'bold');
        if (p.maxSimilarityPct >= 20) {
          doc.setTextColor(185, 28, 28);
        } else {
          doc.setTextColor(180, 83, 9);
        }
        doc.text(fmtPct(p.maxSimilarityPct), marginX + 114, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(String(p.uniqueMatchCount), marginX + 144, y);
        doc.text(`${p.longestSpanWords} ord`, marginX + 162, y);
        y += 5.2;
      }

      y += 6;

      // Detailed matched passages per flagged pair
      for (const p of flaggedPairs) {
        drawMatchesSection(
          `${p.docATitle} <-> ${p.docBTitle} (${fmtPct(p.maxSimilarityPct)} maks)`,
          p.matches,
          p.docATitle,
          p.docBTitle,
          result.usedAnswerKey
        );
      }
    }
  }

  // Add page numbers & quiet footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Collate - Lokal dokument- og plagiatkontrol', marginX, pageHeight - 8.5);
    doc.text(`Side ${page} af ${totalPages}`, pageWidth - marginX - 18, pageHeight - 8.5);
  }

  const filename =
    result.mode === 'direct'
      ? 'collate-lighedsrapport.pdf'
      : result.mode === 'answer_key'
      ? 'collate-facit-kontrol.pdf'
      : 'collate-holdscanning.pdf';

  doc.save(filename);
}
