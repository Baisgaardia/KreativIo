/**
 * IØ-sammenhængsudfordring til oplåsning af Street View i hver runde.
 * Alle profiler og rigtige svar udledes 100 % ud fra landets faktiske OECD-data (2015–2025).
 */

import { CountryEconomicSummary, formatSignedDaNumber } from './oecdData';

export const ANALYSIS_MAX_POINTS = 1500;
export const HINT_COST_POINTS = 250;

export type EconomicPatternId =
  | 'IMPROVED_BOTH'
  | 'PDTY_BOOM_LOW_ULC'
  | 'CATCHUP_OVERHEAT'
  | 'COST_PRESSURE'
  | 'ULC_UP_CPI_FLAT'
  | 'ULC_DOWN_CPI_STABLE'
  | 'CPI_UP_MODEST_ULC'
  | 'STABLE_BALANCED';

export interface EconomicChallengeOption {
  id: EconomicPatternId;
  title: string;
  description: string;
}

export interface EconomicChallenge {
  prompt: string;
  options: EconomicChallengeOption[];
  correctOptionId: EconomicPatternId;
  hintDa: string;
  explanationDa: string;
}

const PATTERN_CATALOG: Record<EconomicPatternId, EconomicChallengeOption> = {
  IMPROVED_BOTH: {
    id: 'IMPROVED_BOTH',
    title: 'Tydeligt forbedret priskonkurrenceevne',
    description:
      'Både lønomkostninger og priskonkurrenceindeks falder markant siden 2015 – typisk hjulpet af en svækket valuta eller lavere prisstigninger end udlandet.',
  },
  PDTY_BOOM_LOW_ULC: {
    id: 'PDTY_BOOM_LOW_ULC',
    title: 'Produktivitetshop presser lønomkostninger ned',
    description:
      'Produktiviteten stiger eksplosivt siden 2015 og sænker de relative lønomkostninger markant, selv uden fald i priskonkurrenceindekset.',
  },
  CATCHUP_OVERHEAT: {
    id: 'CATCHUP_OVERHEAT',
    title: 'Høj produktivitet – men endnu hurtigere omkostningsstigning',
    description:
      'Produktiviteten vokser pænt, men både lønomkostninger og priskonkurrenceindeks stiger endnu kraftigere, så priskonkurrenceevnen svækkes.',
  },
  COST_PRESSURE: {
    id: 'COST_PRESSURE',
    title: 'Svag produktivitet og stigende omkostningspres',
    description:
      'Produktiviteten står næsten stille eller falder, mens lønomkostninger og priskonkurrenceindeks stiger – det forværrer priskonkurrenceevnen.',
  },
  ULC_UP_CPI_FLAT: {
    id: 'ULC_UP_CPI_FLAT',
    title: 'Stigende lønomkostninger trods stabilt/faldende prisindeks',
    description:
      'De relative lønomkostninger stiger tydeligt siden 2015, mens priskonkurrenceindekset ligger stabilt eller falder.',
  },
  ULC_DOWN_CPI_STABLE: {
    id: 'ULC_DOWN_CPI_STABLE',
    title: 'Faldende lønomkostninger og stabil priskonkurrence',
    description:
      'Løntilbageholdenhed eller produktivitetsfremgang sænker de relative lønomkostninger, mens priskonkurrenceindekset er stabilt eller svagt faldende.',
  },
  CPI_UP_MODEST_ULC: {
    id: 'CPI_UP_MODEST_ULC',
    title: 'Stigende prisniveau svækker priskonkurrenceevnen',
    description:
      'Priskonkurrenceindekset stiger tydeligt fra 2015 til 2025 og gør landet relativt dyrere, selvom lønomkostningerne kun stiger moderat.',
  },
  STABLE_BALANCED: {
    id: 'STABLE_BALANCED',
    title: 'Relativt stabil konkurrenceevne uden store skred',
    description:
      'Lønomkostninger og priskonkurrenceindeks bevæger sig kun beskedent fra 2015 til 2025 uden store op- eller nedture.',
  },
};

/**
 * Kontrasterende forkerte svarmuligheder til hver profil, så alle 4 valgmuligheder
 * altid er tydeligt adskilte ved aflæsning af de 3 grafer.
 */
const DISTRACTORS_BY_PATTERN: Record<EconomicPatternId, EconomicPatternId[]> = {
  IMPROVED_BOTH: ['CATCHUP_OVERHEAT', 'COST_PRESSURE', 'STABLE_BALANCED'],
  PDTY_BOOM_LOW_ULC: ['COST_PRESSURE', 'CATCHUP_OVERHEAT', 'IMPROVED_BOTH'],
  CATCHUP_OVERHEAT: ['IMPROVED_BOTH', 'ULC_DOWN_CPI_STABLE', 'STABLE_BALANCED'],
  COST_PRESSURE: ['IMPROVED_BOTH', 'PDTY_BOOM_LOW_ULC', 'ULC_DOWN_CPI_STABLE'],
  ULC_UP_CPI_FLAT: ['IMPROVED_BOTH', 'ULC_DOWN_CPI_STABLE', 'CATCHUP_OVERHEAT'],
  ULC_DOWN_CPI_STABLE: ['CATCHUP_OVERHEAT', 'COST_PRESSURE', 'CPI_UP_MODEST_ULC'],
  CPI_UP_MODEST_ULC: ['IMPROVED_BOTH', 'ULC_DOWN_CPI_STABLE', 'PDTY_BOOM_LOW_ULC'],
  STABLE_BALANCED: ['IMPROVED_BOTH', 'CATCHUP_OVERHEAT', 'COST_PRESSURE'],
};

export function classifyCountryPattern(
  summary: CountryEconomicSummary
): EconomicPatternId {
  const pdtyPct = summary.pdty.percentChange ?? 0;
  const ulcDiff = summary.ulcdr.change ?? 0;
  const cpiDiff = summary.cpidr.change ?? 0;

  if (cpiDiff <= -4 && ulcDiff <= -3) return 'IMPROVED_BOTH';
  if (pdtyPct >= 10 && ulcDiff <= -3) return 'PDTY_BOOM_LOW_ULC';
  if (pdtyPct >= 7 && ulcDiff >= 7 && cpiDiff >= 5) return 'CATCHUP_OVERHEAT';
  if ((ulcDiff >= 4 && cpiDiff >= 5) || (ulcDiff >= 8 && cpiDiff >= 3)) {
    return 'COST_PRESSURE';
  }
  if (ulcDiff >= 5 && cpiDiff < 3) return 'ULC_UP_CPI_FLAT';
  if (ulcDiff <= -3 && cpiDiff > -4) return 'ULC_DOWN_CPI_STABLE';
  if (cpiDiff >= 5 && ulcDiff < 4) return 'CPI_UP_MODEST_ULC';
  return 'STABLE_BALANCED';
}

export function getAnalysisPointsForAttempt(attemptNumber: number): number {
  if (attemptNumber <= 1) return 1500;
  if (attemptNumber === 2) return 750;
  if (attemptNumber === 3) return 250;
  return 0;
}

export function buildEconomicChallenge(
  summary: CountryEconomicSummary | null,
  roundIndex: number
): EconomicChallenge | null {
  if (!summary) return null;

  const correctId = classifyCountryPattern(summary);
  const distractorIds = DISTRACTORS_BY_PATTERN[correctId];
  const rawOptions = [
    PATTERN_CATALOG[correctId],
    ...distractorIds.map((id) => PATTERN_CATALOG[id]),
  ];

  // Deterministisk rotation af rækkefølgen ud fra landekode og runde
  const shift =
    (summary.countryCode.charCodeAt(0) +
      summary.countryCode.charCodeAt(1) +
      roundIndex) %
    rawOptions.length;
  const options = rawOptions.map(
    (_, idx) => rawOptions[(idx + shift) % rawOptions.length]
  );

  const refYear = summary.cpidr.referenceYear ?? 2015;
  const latYear = summary.cpidr.latestYear ?? 2025;
  const pdtyPct = formatSignedDaNumber(summary.pdty.percentChange, 1);
  const ulcDiff = formatSignedDaNumber(summary.ulcdr.change, 1);
  const cpiDiff = formatSignedDaNumber(summary.cpidr.change, 1);

  return {
    prompt: `Aflæs de tre grafer til venstre (${refYear}–${latYear}). Hvilken økonomisk sammenhæng passer på dette land?`,
    options,
    correctOptionId: correctId,
    hintDa:
      'Tip: Sammenlign kurvernes niveau i 2015 med 2025. Husk at stigende lønomkostnings- og priskonkurrenceindeks betyder dyrere varer (svækket priskonkurrenceevne), mens faldende indeks betyder forbedret priskonkurrenceevne.',
    explanationDa: `Fra ${refYear} til ${latYear} ændrede produktiviteten sig med ${pdtyPct} %, lønomkostningerne med ${ulcDiff} indekspoint og priskonkurrenceindekset med ${cpiDiff} indekspoint.`,
  };
}
