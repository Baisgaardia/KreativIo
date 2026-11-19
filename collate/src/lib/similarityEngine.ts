export interface TextToken {
  raw: string;
  normalized: string;
  stem: string;
  start: number;
  end: number;
  isStopword: boolean;
}

export interface TextSpan {
  startChar: number;
  endChar: number;
  startToken: number;
  endToken: number;
  text: string;
  wordCount: number;
}

export type MatchKind = 'exact' | 'paraphrase';

export type AnswerKeyClassification =
  | 'unique_similarity'
  | 'matches_answer_key';

export interface SimilarityMatch {
  id: string;
  index: number;
  label: string;
  kind: MatchKind;
  classification: AnswerKeyClassification;
  spanA: TextSpan;
  spanB: TextSpan;
  spanKey?: TextSpan;
  similarityPct: number;
  answerKeyOverlapPct: number;
  sharedKeywords: string[];
  extraOccurrencesInB: number;
}

export interface KeyAlignmentMatch {
  id: string;
  label: string;
  docTarget: 'A' | 'B';
  kind: MatchKind;
  spanDoc: TextSpan;
  spanKey: TextSpan;
  similarityPct: number;
}

export interface ComparisonOptions {
  minPhraseWords: number;
  includeParaphrases: boolean;
  ignoreStopwordOnly: boolean;
}

export interface DirectComparisonResult {
  mode: 'direct';
  tokensA: TextToken[];
  tokensB: TextToken[];
  matches: SimilarityMatch[];
  similarityPctA: number;
  similarityPctB: number;
  matchedWordsA: number;
  matchedWordsB: number;
  exactCount: number;
  paraphraseCount: number;
}

export interface AnswerKeyComparisonResult {
  mode: 'answer_key';
  tokensA: TextToken[];
  tokensB: TextToken[];
  tokensKey: TextToken[];
  uniqueMatches: SimilarityMatch[];
  expectedMatches: SimilarityMatch[];
  keyMatchesA: KeyAlignmentMatch[];
  keyMatchesB: KeyAlignmentMatch[];
  uniqueSimilarityPctA: number;
  uniqueSimilarityPctB: number;
  uniqueMatchedWordsA: number;
  uniqueMatchedWordsB: number;
  answerCoveragePctA: number;
  answerCoveragePctB: number;
  filteredOverlapCount: number;
}

export interface BatchDocumentInput {
  id: string;
  title: string;
  text: string;
}

export interface BatchPairSummary {
  pairId: string;
  docAId: string;
  docBId: string;
  docATitle: string;
  docBTitle: string;
  similarityPctA: number;
  similarityPctB: number;
  maxSimilarityPct: number;
  uniqueMatchCount: number;
  exactCount: number;
  paraphraseCount: number;
  longestSpanWords: number;
  filteredOverlapCount: number;
  matches: SimilarityMatch[];
  expectedMatches: SimilarityMatch[];
}

export interface BatchDocStat {
  id: string;
  title: string;
  wordCount: number;
  highestPairPct: number;
  mostSimilarPeerTitle: string | null;
  flaggedPairCount: number;
}

export interface BatchComparisonResult {
  mode: 'batch';
  usedAnswerKey: boolean;
  totalPairs: number;
  flaggedPairCount: number;
  highestPairPct: number;
  highestPairLabel: string;
  longestSpanWords: number;
  pairs: BatchPairSummary[];
  docStats: BatchDocStat[];
}

const STOPWORDS = new Set<string>([
  // English
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'done', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he',
  'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'may', 'me',
  'might', 'more', 'most', 'must', 'my', 'myself', 'no', 'nor', 'not',
  'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'shall', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with',
  'would', 'you', 'your', 'yours', 'yourself', 'yourselves', 'also', 'about',
  'above', 'after', 'again', 'against', 'all', 'am', 'any', 'because', 'before',
  'below', 'between', 'both', 'down',
  // Danish
  'og', 'i', 'jeg', 'det', 'at', 'en', 'den', 'til', 'er', 'som', 'på', 'de',
  'med', 'han', 'af', 'for', 'ikke', 'der', 'var', 'mig', 'sig', 'men', 'et',
  'har', 'om', 'vi', 'min', 'havde', 'ham', 'hun', 'nu', 'over', 'da', 'fra',
  'du', 'ud', 'sin', 'dem', 'os', 'op', 'man', 'hans', 'hvor', 'eller', 'hvad',
  'skal', 'selv', 'her', 'alle', 'vil', 'blev', 'kunne', 'ind', 'når', 'være',
  'dog', 'noget', 'ville', 'jo', 'deres', 'efter', 'ned', 'skulle', 'denne',
  'end', 'dette', 'mit', 'også', 'under', 'have', 'dig', 'anden', 'hende',
  'mine', 'alt', 'meget', 'sit', 'sine', 'vor', 'mod', 'disse', 'hvis', 'din',
  'nogle', 'hos', 'blive', 'mange', 'ad', 'bliver', 'hendes', 'været', 'thi',
  'jer', 'sådan', 'ved', 'kan', 'så', 'omkring', 'gennem', 'mellem', 'fordi',
  'mens', 'hvilken', 'hvilket', 'hvilke', 'kun', 'mere', 'mest', 'flere',
  'flest', 'samt', 'både', 'uden', 'før', 'siden', 'allerede', 'derfor', 'hver',
  'enhver', 'andet', 'andre', 'blandt', 'eftersom', 'få', 'får', 'fik', 'gør',
  'gøre', 'gjorde', 'gjort', 'blevet', 'må', 'måtte', 'bør', 'burde',
]);

const ABBREVIATIONS = new Set<string>([
  'f.eks', 'bl.a', 'dvs', 'osv', 'ca', 'mv', 'm.m', 'm.fl', 'nr', 'pkt',
  'jf', 'evt', 'inkl', 'ekskl', 'såk', 'kl', 'dr', 'prof', 'fig', 'stk',
  'e.g', 'i.e', 'etc', 'vs', 'st', 'mr', 'mrs', 'ms',
]);

export function stemWord(word: string): string {
  if (word.length <= 3) return word;
  let w = word;
  if (w.endsWith("'s") || w.endsWith("’s")) {
    w = w.slice(0, -2);
  }
  const rules: Array<[string, string, number]> = [
    ['ational', 'ate', 3],
    ['tional', 'tion', 3],
    ['ization', 'ize', 3],
    ['fulness', 'ful', 3],
    ['ousness', 'ous', 3],
    ['iveness', 'ive', 3],
    ['elserne', 'else', 3],
    ['ninger', 'ning', 3],
    ['heder', 'hed', 3],
    ['lighed', 'lig', 3],
    ['ation', 'ate', 3],
    ['ments', 'ment', 3],
    ['ment', '', 3],
    ['ness', '', 3],
    ['ities', 'ity', 3],
    ['ity', '', 3],
    ['ings', '', 3],
    ['ing', '', 3],
    ['erne', '', 3],
    ['ende', '', 3],
    ['ede', '', 3],
    ['ene', '', 3],
    ['ere', '', 3],
    ['ied', 'y', 2],
    ['ies', 'y', 2],
    ['able', '', 3],
    ['ible', '', 3],
    ['ally', '', 3],
    ['edly', '', 3],
    ['ously', '', 3],
    ['et', '', 3],
    ['en', '', 3],
    ['er', '', 3],
    ['ed', '', 3],
    ['ly', '', 3],
    ['es', '', 3],
    ['e', '', 3],
    ['s', '', 3],
  ];
  for (const [suffix, replacement, minStem] of rules) {
    if (w.endsWith(suffix) && w.length - suffix.length >= minStem) {
      return w.slice(0, w.length - suffix.length) + replacement;
    }
  }
  return w;
}

export function tokenizeText(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  const regex = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const normalized = raw.toLowerCase().replace(/’/g, "'");
    const isStopword = STOPWORDS.has(normalized);
    tokens.push({
      raw,
      normalized,
      stem: stemWord(normalized),
      start: match.index,
      end: match.index + raw.length,
      isStopword,
    });
  }
  return tokens;
}

interface SentenceSegment {
  startChar: number;
  endChar: number;
  startToken: number;
  endToken: number;
  contentStems: string[];
  allStems: string[];
  text: string;
}

function isAbbreviationBoundary(text: string, dotIndex: number): boolean {
  // Check backwards up to 10 chars for a word/abbreviation
  const before = text.slice(Math.max(0, dotIndex - 10), dotIndex).toLowerCase();
  const match = before.match(/([a-zæøå.]+)$/);
  if (match) {
    const candidate = match[1];
    if (ABBREVIATIONS.has(candidate)) return true;
    // Single letter followed by period (e.g. "f." in "f.eks." or "A.")
    if (candidate.length === 1 && text[dotIndex + 1] !== '\n') return true;
  }
  // Ordinal / decimal like "3.g" or "2.1"
  const prevChar = dotIndex > 0 ? text[dotIndex - 1] : '';
  const nextChar = dotIndex + 1 < text.length ? text[dotIndex + 1] : '';
  if (/\d/.test(prevChar) && /[a-zæøå0-9]/i.test(nextChar)) return true;
  return false;
}

function splitIntoSentences(text: string, tokens: TextToken[]): SentenceSegment[] {
  if (tokens.length === 0) return [];
  const segments: SentenceSegment[] = [];
  const boundaries: Array<{ start: number; end: number }> = [];

  let segStart = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    let shouldSplit = false;

    if (ch === '\n') {
      shouldSplit = true;
    } else if (ch === '!' || ch === '?') {
      shouldSplit = true;
    } else if (ch === '.') {
      const next = i + 1 < text.length ? text[i + 1] : '';
      if ((next === '' || /\s/.test(next)) && !isAbbreviationBoundary(text, i)) {
        shouldSplit = true;
      }
    }

    if (shouldSplit) {
      const sliceEnd = ch === '\n' ? i : i + 1;
      const rawSeg = text.slice(segStart, sliceEnd);
      const trimmedLeft = rawSeg.search(/\S/);
      if (trimmedLeft !== -1) {
        const trimmedRight = rawSeg.trimEnd().length;
        boundaries.push({
          start: segStart + trimmedLeft,
          end: segStart + trimmedRight,
        });
      }
      segStart = i + 1;
    }
  }

  if (segStart < text.length) {
    const rawSeg = text.slice(segStart);
    const trimmedLeft = rawSeg.search(/\S/);
    if (trimmedLeft !== -1) {
      const trimmedRight = rawSeg.trimEnd().length;
      boundaries.push({
        start: segStart + trimmedLeft,
        end: segStart + trimmedRight,
      });
    }
  }

  let tokPtr = 0;
  for (const b of boundaries) {
    while (tokPtr < tokens.length && tokens[tokPtr].end <= b.start) {
      tokPtr++;
    }
    const startToken = tokPtr;
    while (tokPtr < tokens.length && tokens[tokPtr].start < b.end) {
      tokPtr++;
    }
    const endToken = tokPtr - 1;
    if (endToken >= startToken) {
      const contentStems: string[] = [];
      const allStems: string[] = [];
      for (let i = startToken; i <= endToken; i++) {
        allStems.push(tokens[i].stem);
        if (!tokens[i].isStopword && tokens[i].normalized.length > 1) {
          contentStems.push(tokens[i].stem);
        }
      }
      segments.push({
        startChar: tokens[startToken].start,
        endChar: tokens[endToken].end,
        startToken,
        endToken,
        contentStems,
        allStems,
        text: text.slice(tokens[startToken].start, tokens[endToken].end),
      });
    }
  }
  return segments;
}

function lcsLength(seqA: string[], seqB: string[]): number {
  const m = seqA.length;
  const n = seqB.length;
  if (m === 0 || n === 0) return 0;
  let prev = new Uint16Array(n + 1);
  let curr = new Uint16Array(n + 1);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (seqA[i - 1] === seqB[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = prev[j] > curr[j - 1] ? prev[j] : curr[j - 1];
      }
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
    curr.fill(0);
  }
  return prev[n];
}

interface RawPairMatch {
  aStart: number;
  aEnd: number;
  bStart: number;
  bEnd: number;
  kind: MatchKind;
  similarityPct: number;
  sharedKeywords: string[];
  extraOccurrencesInB: number;
}

function countNonStopwords(tokens: TextToken[], start: number, end: number): number {
  let count = 0;
  for (let i = start; i <= end; i++) {
    if (!tokens[i].isStopword) count++;
  }
  return count;
}

function collectSharedKeywords(
  tokensA: TextToken[],
  aStart: number,
  aEnd: number,
  tokensB?: TextToken[],
  bStart?: number,
  bEnd?: number
): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];
  if (tokensB && bStart !== undefined && bEnd !== undefined) {
    const stemsB = new Set<string>();
    for (let j = bStart; j <= bEnd; j++) {
      if (!tokensB[j].isStopword && tokensB[j].normalized.length > 2) {
        stemsB.add(tokensB[j].stem);
      }
    }
    for (let i = aStart; i <= aEnd; i++) {
      const t = tokensA[i];
      if (!t.isStopword && t.normalized.length > 2 && stemsB.has(t.stem) && !seen.has(t.normalized)) {
        seen.add(t.normalized);
        keywords.push(t.normalized);
        if (keywords.length >= 6) break;
      }
    }
  } else {
    for (let i = aStart; i <= aEnd; i++) {
      const t = tokensA[i];
      if (!t.isStopword && t.normalized.length > 2 && !seen.has(t.normalized)) {
        seen.add(t.normalized);
        keywords.push(t.normalized);
        if (keywords.length >= 6) break;
      }
    }
  }
  return keywords;
}

function findRawMatches(
  textA: string,
  tokensA: TextToken[],
  textB: string,
  tokensB: TextToken[],
  options: ComparisonOptions
): RawPairMatch[] {
  const k = Math.max(2, Math.min(10, options.minPhraseWords));
  if (tokensA.length < Math.min(k, 3) || tokensB.length < Math.min(k, 3)) return [];

  // 1. Exact contiguous n-gram matches
  const exactCandidates: RawPairMatch[] = [];
  if (tokensA.length >= k && tokensB.length >= k) {
    const indexB = new Map<string, number[]>();
    for (let j = 0; j <= tokensB.length - k; j++) {
      let key = '';
      for (let offset = 0; offset < k; offset++) {
        key += (offset > 0 ? '\u0001' : '') + tokensB[j + offset].normalized;
      }
      const list = indexB.get(key);
      if (list) {
        list.push(j);
      } else {
        indexB.set(key, [j]);
      }
    }

    for (let i = 0; i <= tokensA.length - k; i++) {
      let key = '';
      for (let offset = 0; offset < k; offset++) {
        key += (offset > 0 ? '\u0001' : '') + tokensA[i + offset].normalized;
      }
      const hits = indexB.get(key);
      if (!hits) continue;

      for (const j of hits) {
        if (i > 0 && j > 0 && tokensA[i - 1].normalized === tokensB[j - 1].normalized) {
          continue;
        }

        let len = k;
        while (
          i + len < tokensA.length &&
          j + len < tokensB.length &&
          tokensA[i + len].normalized === tokensB[j + len].normalized
        ) {
          len++;
        }

        const contentWords = countNonStopwords(tokensA, i, i + len - 1);
        if (options.ignoreStopwordOnly && contentWords < Math.min(2, Math.ceil(k * 0.4)) && len < 7) {
          continue;
        }

        exactCandidates.push({
          aStart: i,
          aEnd: i + len - 1,
          bStart: j,
          bEnd: j + len - 1,
          kind: 'exact',
          similarityPct: 100,
          sharedKeywords: collectSharedKeywords(tokensA, i, i + len - 1),
          extraOccurrencesInB: 0,
        });
      }
    }
  }

  exactCandidates.sort((m1, m2) => {
    const len1 = m1.aEnd - m1.aStart;
    const len2 = m2.aEnd - m2.aStart;
    if (len2 !== len1) return len2 - len1;
    if (m1.aStart !== m2.aStart) return m1.aStart - m2.aStart;
    return m1.bStart - m2.bStart;
  });

  const coveredA = new Uint8Array(tokensA.length);
  const coveredB = new Uint8Array(tokensB.length);
  const selectedMatches: RawPairMatch[] = [];

  for (const cand of exactCandidates) {
    let overlapA = 0;
    const len = cand.aEnd - cand.aStart + 1;
    for (let idx = cand.aStart; idx <= cand.aEnd; idx++) {
      if (coveredA[idx]) overlapA++;
    }
    if (overlapA / len > 0.45) continue;

    let extraInB = 0;
    for (const other of exactCandidates) {
      if (other !== cand && other.aStart === cand.aStart && other.aEnd === cand.aEnd) {
        extraInB++;
      }
    }

    for (let idx = cand.aStart; idx <= cand.aEnd; idx++) coveredA[idx] = 1;
    for (let idx = cand.bStart; idx <= cand.bEnd; idx++) coveredB[idx] = 1;

    selectedMatches.push({
      ...cand,
      extraOccurrencesInB: extraInB,
    });
  }

  // 2. Near-identical & Paraphrase Detection (when includeParaphrases is enabled)
  if (options.includeParaphrases) {
    // 2a. Gap-bridged stemmed anchor matching:
    // Catches nearly identical sentences where 1-2 words were swapped, inflected, or inserted
    // even when minPhraseWords is set to 5 or 6+.
    const anchorSize = 3;
    if (tokensA.length >= anchorSize && tokensB.length >= anchorSize) {
      const stemIndexB = new Map<string, number[]>();
      for (let j = 0; j <= tokensB.length - anchorSize; j++) {
        const key = `${tokensB[j].stem}\u0001${tokensB[j + 1].stem}\u0001${tokensB[j + 2].stem}`;
        const list = stemIndexB.get(key);
        if (list) list.push(j);
        else stemIndexB.set(key, [j]);
      }

      interface AnchorRun {
        aStart: number;
        aEnd: number;
        bStart: number;
        bEnd: number;
      }
      const stemRuns: AnchorRun[] = [];
      for (let i = 0; i <= tokensA.length - anchorSize; i++) {
        const key = `${tokensA[i].stem}\u0001${tokensA[i + 1].stem}\u0001${tokensA[i + 2].stem}`;
        const hits = stemIndexB.get(key);
        if (!hits) continue;
        for (const j of hits) {
          if (i > 0 && j > 0 && tokensA[i - 1].stem === tokensB[j - 1].stem) {
            continue;
          }
          let len = anchorSize;
          while (
            i + len < tokensA.length &&
            j + len < tokensB.length &&
            tokensA[i + len].stem === tokensB[j + len].stem
          ) {
            len++;
          }
          stemRuns.push({
            aStart: i,
            aEnd: i + len - 1,
            bStart: j,
            bEnd: j + len - 1,
          });
        }
      }

      // Bridge nearby collinear stem runs (gap <= 3 tokens in A and B)
      stemRuns.sort((r1, r2) => r1.aStart - r2.aStart || r1.bStart - r2.bStart);
      const bridgedCandidates: RawPairMatch[] = [];
      const usedAnchor = new Uint8Array(stemRuns.length);

      for (let idx = 0; idx < stemRuns.length; idx++) {
        if (usedAnchor[idx]) continue;
        let curAStart = stemRuns[idx].aStart;
        let curAEnd = stemRuns[idx].aEnd;
        let curBStart = stemRuns[idx].bStart;
        let curBEnd = stemRuns[idx].bEnd;
        usedAnchor[idx] = 1;

        let extended = true;
        while (extended) {
          extended = false;
          for (let nextIdx = idx + 1; nextIdx < stemRuns.length; nextIdx++) {
            if (usedAnchor[nextIdx]) continue;
            const nxt = stemRuns[nextIdx];
            const gapA = nxt.aStart - curAEnd - 1;
            const gapB = nxt.bStart - curBEnd - 1;
            if (gapA >= -1 && gapA <= 3 && gapB >= -1 && gapB <= 3) {
              curAEnd = Math.max(curAEnd, nxt.aEnd);
              curBEnd = Math.max(curBEnd, nxt.bEnd);
              usedAnchor[nextIdx] = 1;
              extended = true;
            }
          }
        }

        const spanLenA = curAEnd - curAStart + 1;
        const spanLenB = curBEnd - curBStart + 1;
        const minRequired = Math.max(5, k);
        if (Math.min(spanLenA, spanLenB) < minRequired) continue;

        const seqA = tokensA.slice(curAStart, curAEnd + 1).map((t) => t.stem);
        const seqB = tokensB.slice(curBStart, curBEnd + 1).map((t) => t.stem);
        const lcs = lcsLength(seqA, seqB);
        const ratio = lcs / Math.max(seqA.length, seqB.length);
        const contentCount = countNonStopwords(tokensA, curAStart, curAEnd);

        if (ratio >= 0.65 && contentCount >= 3) {
          bridgedCandidates.push({
            aStart: curAStart,
            aEnd: curAEnd,
            bStart: curBStart,
            bEnd: curBEnd,
            kind: 'paraphrase',
            similarityPct: Math.min(98, Math.round(ratio * 100)),
            sharedKeywords: collectSharedKeywords(
              tokensA,
              curAStart,
              curAEnd,
              tokensB,
              curBStart,
              curBEnd
            ),
            extraOccurrencesInB: 0,
          });
        }
      }

      bridgedCandidates.sort(
        (a, b) => b.aEnd - b.aStart - (a.aEnd - a.aStart) || b.similarityPct - a.similarityPct
      );
      for (const bc of bridgedCandidates) {
        let overlapA = 0;
        const lenA = bc.aEnd - bc.aStart + 1;
        for (let t = bc.aStart; t <= bc.aEnd; t++) {
          if (coveredA[t]) overlapA++;
        }
        if (overlapA / lenA > 0.4) continue;

        for (let t = bc.aStart; t <= bc.aEnd; t++) coveredA[t] = 1;
        for (let t = bc.bStart; t <= bc.bEnd; t++) coveredB[t] = 1;
        selectedMatches.push(bc);
      }
    }

    // 2b. Sentence-level paraphrase, inflection, and ordered sequence alignment
    const sentencesA = splitIntoSentences(textA, tokensA);
    const sentencesB = splitIntoSentences(textB, tokensB);

    interface ParaphraseCand {
      sA: SentenceSegment;
      sB: SentenceSegment;
      score: number;
      sharedKeywords: string[];
    }
    const paraCandidates: ParaphraseCand[] = [];

    for (const sA of sentencesA) {
      if (sA.allStems.length < 5 || sA.contentStems.length < 3) continue;
      let coveredTokens = 0;
      const totalTokens = sA.endToken - sA.startToken + 1;
      for (let t = sA.startToken; t <= sA.endToken; t++) {
        if (coveredA[t]) coveredTokens++;
      }
      if (coveredTokens / totalTokens >= 0.6) continue;

      const setA = new Set(sA.contentStems);

      for (const sB of sentencesB) {
        if (sB.allStems.length < 5 || sB.contentStems.length < 3) continue;

        const setB = new Set(sB.contentStems);
        let sharedUnique = 0;
        for (const st of setA) {
          if (setB.has(st)) sharedUnique++;
        }
        if (sharedUnique < 3) continue;

        const dice = (2 * sharedUnique) / (setA.size + setB.size);
        const jaccard = sharedUnique / (setA.size + setB.size - sharedUnique);
        const containment = sharedUnique / Math.min(setA.size, setB.size);

        const bigramsA = new Set<string>();
        for (let i = 0; i < sA.contentStems.length - 1; i++) {
          bigramsA.add(sA.contentStems[i] + '|' + sA.contentStems[i + 1]);
        }
        let sharedBigrams = 0;
        for (let i = 0; i < sB.contentStems.length - 1; i++) {
          if (bigramsA.has(sB.contentStems[i] + '|' + sB.contentStems[i + 1])) {
            sharedBigrams++;
          }
        }
        const bigramDice =
          sA.contentStems.length > 1 && sB.contentStems.length > 1
            ? (2 * sharedBigrams) / (sA.contentStems.length - 1 + (sB.contentStems.length - 1))
            : 0;

        // Ordered full-token LCS ratio catches almost-identical sentences with 1-2 changed words
        const fullLcs = lcsLength(sA.allStems, sB.allStems);
        const orderedRatio = fullLcs / Math.max(sA.allStems.length, sB.allStems.length);
        const orderedContain = fullLcs / Math.min(sA.allStems.length, sB.allStems.length);

        const combinedScore = Math.max(
          dice * 0.72 + bigramDice * 0.28,
          orderedRatio * 0.85 + containment * 0.15
        );

        const isTraditionalParaphrase =
          sharedUnique >= 4 && dice * 0.72 + bigramDice * 0.28 >= 0.50 && jaccard >= 0.34;
        const isNearIdenticalShort =
          sharedUnique >= 3 && orderedRatio >= 0.64 && Math.min(sA.allStems.length, sB.allStems.length) >= 6;
        const isContainedClause =
          sharedUnique >= 4 && containment >= 0.78 && orderedContain >= 0.72 && Math.min(sA.allStems.length, sB.allStems.length) >= 6;

        if (isTraditionalParaphrase || isNearIdenticalShort || isContainedClause) {
          paraCandidates.push({
            sA,
            sB,
            score: Math.min(98, Math.round(combinedScore * 100)),
            sharedKeywords: collectSharedKeywords(
              tokensA,
              sA.startToken,
              sA.endToken,
              tokensB,
              sB.startToken,
              sB.endToken
            ),
          });
        }
      }
    }

    paraCandidates.sort((a, b) => b.score - a.score);
    for (const p of paraCandidates) {
      let overlapA = 0;
      const lenA = p.sA.endToken - p.sA.startToken + 1;
      for (let t = p.sA.startToken; t <= p.sA.endToken; t++) {
        if (coveredA[t]) overlapA++;
      }
      if (overlapA / lenA > 0.35) continue;

      for (let t = p.sA.startToken; t <= p.sA.endToken; t++) coveredA[t] = 1;
      for (let t = p.sB.startToken; t <= p.sB.endToken; t++) coveredB[t] = 1;

      selectedMatches.push({
        aStart: p.sA.startToken,
        aEnd: p.sA.endToken,
        bStart: p.sB.startToken,
        bEnd: p.sB.endToken,
        kind: 'paraphrase',
        similarityPct: p.score,
        sharedKeywords: p.sharedKeywords,
        extraOccurrencesInB: 0,
      });
    }
  }

  selectedMatches.sort((a, b) => a.aStart - b.aStart || a.bStart - b.bStart);
  return selectedMatches;
}

function buildTextSpan(
  text: string,
  tokens: TextToken[],
  startToken: number,
  endToken: number
): TextSpan {
  const startChar = tokens[startToken].start;
  const endChar = tokens[endToken].end;
  return {
    startChar,
    endChar,
    startToken,
    endToken,
    text: text.slice(startChar, endChar),
    wordCount: endToken - startToken + 1,
  };
}

function computeCoverageStats(
  totalTokens: number,
  spans: Array<{ startToken: number; endToken: number }>
): { matchedWords: number; pct: number } {
  if (totalTokens === 0) return { matchedWords: 0, pct: 0 };
  const mask = new Uint8Array(totalTokens);
  for (const s of spans) {
    for (let i = s.startToken; i <= s.endToken && i < totalTokens; i++) {
      mask[i] = 1;
    }
  }
  let matchedWords = 0;
  for (let i = 0; i < totalTokens; i++) {
    if (mask[i]) matchedWords++;
  }
  return {
    matchedWords,
    pct: Math.round((matchedWords / totalTokens) * 1000) / 10,
  };
}

export function compareDocuments(
  textA: string,
  textB: string,
  options: ComparisonOptions
): DirectComparisonResult {
  const tokensA = tokenizeText(textA);
  const tokensB = tokenizeText(textB);
  const rawMatches = findRawMatches(textA, tokensA, textB, tokensB, options);

  const matches: SimilarityMatch[] = rawMatches.map((m, idx) => ({
    id: `match-${idx + 1}`,
    index: idx + 1,
    label: `M-${String(idx + 1).padStart(2, '0')}`,
    kind: m.kind,
    classification: 'unique_similarity',
    spanA: buildTextSpan(textA, tokensA, m.aStart, m.aEnd),
    spanB: buildTextSpan(textB, tokensB, m.bStart, m.bEnd),
    similarityPct: m.similarityPct,
    answerKeyOverlapPct: 0,
    sharedKeywords: m.sharedKeywords,
    extraOccurrencesInB: m.extraOccurrencesInB,
  }));

  const statsA = computeCoverageStats(
    tokensA.length,
    matches.map((m) => m.spanA)
  );
  const statsB = computeCoverageStats(
    tokensB.length,
    matches.map((m) => m.spanB)
  );

  return {
    mode: 'direct',
    tokensA,
    tokensB,
    matches,
    similarityPctA: statsA.pct,
    similarityPctB: statsB.pct,
    matchedWordsA: statsA.matchedWords,
    matchedWordsB: statsB.matchedWords,
    exactCount: matches.filter((m) => m.kind === 'exact').length,
    paraphraseCount: matches.filter((m) => m.kind === 'paraphrase').length,
  };
}

export function compareWithAnswerKey(
  textA: string,
  textB: string,
  textKey: string,
  options: ComparisonOptions
): AnswerKeyComparisonResult {
  const tokensA = tokenizeText(textA);
  const tokensB = tokenizeText(textB);
  const tokensKey = tokenizeText(textKey);

  const keyOptions: ComparisonOptions = {
    ...options,
    minPhraseWords: Math.min(options.minPhraseWords, 4),
  };

  const rawAtoKey = findRawMatches(textA, tokensA, textKey, tokensKey, keyOptions);
  const rawBtoKey = findRawMatches(textB, tokensB, textKey, tokensKey, keyOptions);

  const inKeyA = new Uint8Array(tokensA.length);
  const keyMatchesA: KeyAlignmentMatch[] = rawAtoKey.map((m, idx) => {
    for (let i = m.aStart; i <= m.aEnd; i++) inKeyA[i] = 1;
    return {
      id: `key-a-${idx + 1}`,
      label: `F-A${idx + 1}`,
      docTarget: 'A',
      kind: m.kind,
      spanDoc: buildTextSpan(textA, tokensA, m.aStart, m.aEnd),
      spanKey: buildTextSpan(textKey, tokensKey, m.bStart, m.bEnd),
      similarityPct: m.similarityPct,
    };
  });

  const inKeyB = new Uint8Array(tokensB.length);
  const keyMatchesB: KeyAlignmentMatch[] = rawBtoKey.map((m, idx) => {
    for (let i = m.aStart; i <= m.aEnd; i++) inKeyB[i] = 1;
    return {
      id: `key-b-${idx + 1}`,
      label: `F-B${idx + 1}`,
      docTarget: 'B',
      kind: m.kind,
      spanDoc: buildTextSpan(textB, tokensB, m.aStart, m.aEnd),
      spanKey: buildTextSpan(textKey, tokensKey, m.bStart, m.bEnd),
      similarityPct: m.similarityPct,
    };
  });

  const keyTrigrams = new Set<string>();
  for (let i = 0; i <= tokensKey.length - 3; i++) {
    keyTrigrams.add(
      `${tokensKey[i].normalized}\u0001${tokensKey[i + 1].normalized}\u0001${tokensKey[i + 2].normalized}`
    );
  }

  const rawAB = findRawMatches(textA, tokensA, textB, tokensB, options);

  const uniqueMatches: SimilarityMatch[] = [];
  const expectedMatches: SimilarityMatch[] = [];

  for (const m of rawAB) {
    let totalContentTokens = 0;
    let coveredContentByKey = 0;
    let coveredByKeyMask = 0;
    const len = m.aEnd - m.aStart + 1;

    for (let offset = 0; offset < len; offset++) {
      const idxA = m.aStart + offset;
      const idxB = Math.min(m.bStart + offset, m.bEnd);
      const tokA = tokensA[idxA];

      const trigramMatch =
        idxA + 2 <= m.aEnd &&
        keyTrigrams.has(
          `${tokensA[idxA].normalized}\u0001${tokensA[idxA + 1].normalized}\u0001${tokensA[idxA + 2].normalized}`
        );

      const inKey =
        inKeyA[idxA] === 1 ||
        inKeyB[idxB] === 1 ||
        trigramMatch;

      if (inKey) coveredByKeyMask++;

      if (!tokA.isStopword) {
        totalContentTokens++;
        if (inKey) {
          coveredContentByKey++;
        }
      }
    }

    const answerKeyOverlapPct =
      totalContentTokens > 0
        ? Math.round((coveredContentByKey / totalContentTokens) * 100)
        : Math.round((coveredByKeyMask / len) * 100);

    const nonKeyContentWords = totalContentTokens - coveredContentByKey;

    const isExplainedByAnswerKey =
      answerKeyOverlapPct >= 75 || (nonKeyContentWords < 2 && answerKeyOverlapPct >= 55);

    if (isExplainedByAnswerKey) {
      const idx = expectedMatches.length + 1;
      expectedMatches.push({
        id: `expected-${idx}`,
        index: idx,
        label: `F-${String(idx).padStart(2, '0')}`,
        kind: m.kind,
        classification: 'matches_answer_key',
        spanA: buildTextSpan(textA, tokensA, m.aStart, m.aEnd),
        spanB: buildTextSpan(textB, tokensB, m.bStart, m.bEnd),
        similarityPct: m.similarityPct,
        answerKeyOverlapPct,
        sharedKeywords: m.sharedKeywords,
        extraOccurrencesInB: m.extraOccurrencesInB,
      });
    } else {
      let effAStart = m.aStart;
      let effAEnd = m.aEnd;
      let effBStart = m.bStart;
      let effBEnd = m.bEnd;

      if (m.kind === 'exact' && answerKeyOverlapPct > 0) {
        while (
          effAEnd - effAStart + 1 > options.minPhraseWords &&
          (inKeyA[effAStart] === 1 || inKeyB[effBStart] === 1)
        ) {
          effAStart++;
          effBStart++;
        }
        while (
          effAEnd - effAStart + 1 > options.minPhraseWords &&
          (inKeyA[effAEnd] === 1 || inKeyB[effBEnd] === 1)
        ) {
          effAEnd--;
          effBEnd--;
        }
      }

      const idx = uniqueMatches.length + 1;
      uniqueMatches.push({
        id: `unique-${idx}`,
        index: idx,
        label: `U-${String(idx).padStart(2, '0')}`,
        kind: m.kind,
        classification: 'unique_similarity',
        spanA: buildTextSpan(textA, tokensA, effAStart, effAEnd),
        spanB: buildTextSpan(textB, tokensB, effBStart, effBEnd),
        similarityPct: m.similarityPct,
        answerKeyOverlapPct,
        sharedKeywords: m.sharedKeywords,
        extraOccurrencesInB: m.extraOccurrencesInB,
      });
    }
  }

  const uniqueStatsA = computeCoverageStats(
    tokensA.length,
    uniqueMatches.map((m) => m.spanA)
  );
  const uniqueStatsB = computeCoverageStats(
    tokensB.length,
    uniqueMatches.map((m) => m.spanB)
  );
  const keyStatsA = computeCoverageStats(
    tokensA.length,
    keyMatchesA.map((m) => m.spanDoc)
  );
  const keyStatsB = computeCoverageStats(
    tokensB.length,
    keyMatchesB.map((m) => m.spanDoc)
  );

  return {
    mode: 'answer_key',
    tokensA,
    tokensB,
    tokensKey,
    uniqueMatches,
    expectedMatches,
    keyMatchesA,
    keyMatchesB,
    uniqueSimilarityPctA: uniqueStatsA.pct,
    uniqueSimilarityPctB: uniqueStatsB.pct,
    uniqueMatchedWordsA: uniqueStatsA.matchedWords,
    uniqueMatchedWordsB: uniqueStatsB.matchedWords,
    answerCoveragePctA: keyStatsA.pct,
    answerCoveragePctB: keyStatsB.pct,
    filteredOverlapCount: expectedMatches.length,
  };
}

export function compareBatchDocuments(
  docs: BatchDocumentInput[],
  answerKeyText: string,
  options: ComparisonOptions
): BatchComparisonResult {
  const usedAnswerKey = answerKeyText.trim().length > 0;
  const tokensByDoc = docs.map((d) => tokenizeText(d.text));
  const pairs: BatchPairSummary[] = [];

  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const docA = docs[i];
      const docB = docs[j];

      if (usedAnswerKey) {
        const res = compareWithAnswerKey(docA.text, docB.text, answerKeyText, options);
        const maxPct = Math.max(res.uniqueSimilarityPctA, res.uniqueSimilarityPctB);
        const longest =
          res.uniqueMatches.length > 0
            ? Math.max(...res.uniqueMatches.map((m) => m.spanA.wordCount))
            : 0;
        pairs.push({
          pairId: `${docA.id}__${docB.id}`,
          docAId: docA.id,
          docBId: docB.id,
          docATitle: docA.title,
          docBTitle: docB.title,
          similarityPctA: res.uniqueSimilarityPctA,
          similarityPctB: res.uniqueSimilarityPctB,
          maxSimilarityPct: maxPct,
          uniqueMatchCount: res.uniqueMatches.length,
          exactCount: res.uniqueMatches.filter((m) => m.kind === 'exact').length,
          paraphraseCount: res.uniqueMatches.filter((m) => m.kind === 'paraphrase').length,
          longestSpanWords: longest,
          filteredOverlapCount: res.filteredOverlapCount,
          matches: res.uniqueMatches,
          expectedMatches: res.expectedMatches,
        });
      } else {
        const res = compareDocuments(docA.text, docB.text, options);
        const maxPct = Math.max(res.similarityPctA, res.similarityPctB);
        const longest =
          res.matches.length > 0
            ? Math.max(...res.matches.map((m) => m.spanA.wordCount))
            : 0;
        pairs.push({
          pairId: `${docA.id}__${docB.id}`,
          docAId: docA.id,
          docBId: docB.id,
          docATitle: docA.title,
          docBTitle: docB.title,
          similarityPctA: res.similarityPctA,
          similarityPctB: res.similarityPctB,
          maxSimilarityPct: maxPct,
          uniqueMatchCount: res.matches.length,
          exactCount: res.exactCount,
          paraphraseCount: res.paraphraseCount,
          longestSpanWords: longest,
          filteredOverlapCount: 0,
          matches: res.matches,
          expectedMatches: [],
        });
      }
    }
  }

  pairs.sort((a, b) => {
    if (b.maxSimilarityPct !== a.maxSimilarityPct) {
      return b.maxSimilarityPct - a.maxSimilarityPct;
    }
    return b.uniqueMatchCount - a.uniqueMatchCount;
  });

  const docStats: BatchDocStat[] = docs.map((d, idx) => {
    let highestPairPct = 0;
    let mostSimilarPeerTitle: string | null = null;
    let flaggedPairCount = 0;

    for (const p of pairs) {
      if (p.docAId === d.id || p.docBId === d.id) {
        const myPct = p.docAId === d.id ? p.similarityPctA : p.similarityPctB;
        const peerTitle = p.docAId === d.id ? p.docBTitle : p.docATitle;
        if (p.uniqueMatchCount > 0) flaggedPairCount++;
        if (myPct > highestPairPct) {
          highestPairPct = myPct;
          mostSimilarPeerTitle = peerTitle;
        }
      }
    }

    return {
      id: d.id,
      title: d.title,
      wordCount: tokensByDoc[idx].length,
      highestPairPct,
      mostSimilarPeerTitle,
      flaggedPairCount,
    };
  });

  const flaggedPairs = pairs.filter((p) => p.uniqueMatchCount > 0);
  const topPair = pairs[0];
  const longestSpanWords =
    pairs.length > 0 ? Math.max(...pairs.map((p) => p.longestSpanWords)) : 0;

  return {
    mode: 'batch',
    usedAnswerKey,
    totalPairs: pairs.length,
    flaggedPairCount: flaggedPairs.length,
    highestPairPct: topPair ? topPair.maxSimilarityPct : 0,
    highestPairLabel:
      topPair && topPair.uniqueMatchCount > 0
        ? `${topPair.docATitle} ↔ ${topPair.docBTitle}`
        : 'Ingen delte passager fundet',
    longestSpanWords,
    pairs,
    docStats,
  };
}
