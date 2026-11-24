/**
 * Indlæsning, validering og nøgletalsberegning ud fra de uploadede OECD JSON-filer.
 * Alle tal stammer udelukkende fra de faktiske JSON-filer; manglende år springes sikkert over.
 */

import { COUNTRY_DATA_FILES } from '../data/oecdTranslations';

export interface RawOecdFile {
  years: number[];
  dataMap: Record<string, Record<string, number | null | undefined>>;
}

export interface ChartDataPoint {
  year: number;
  pdty: number | null;
  ulcdr: number | null;
  cpidr: number | null;
}

export interface MetricSnapshot {
  latestYear: number | null;
  latestValue: number | null;
  referenceYear: number | null;
  referenceValue: number | null;
  change: number | null;
  percentChange: number | null;
}

export interface RecentMetricRow {
  code: string;
  labelDa: string;
  unit: string;
  values: Array<{ year: number; value: number | null }>;
}

export interface CountryEconomicSummary {
  countryCode: string;
  series: ChartDataPoint[];
  pdty: MetricSnapshot;
  ulcdr: MetricSnapshot;
  cpidr: MetricSnapshot;
  latestInflation: { year: number; value: number } | null;
  latestCurrentAccount: { year: number; value: number } | null;
  latestGdpGrowth: { year: number; value: number } | null;
  latestUnemployment: { year: number; value: number } | null;
  latestPublicDebt: { year: number; value: number } | null;
  hintGroups: {
    pricesAndGrowth: RecentMetricRow[];
    laborAndDebt: RecentMetricRow[];
    externalBalance: RecentMetricRow[];
  };
  missingYearsCount: number;
}

const dataCache = new Map<string, RawOecdFile>();
const summaryCache = new Map<string, CountryEconomicSummary>();

function toFiniteNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  return null;
}

export async function fetchCountryOecdData(countryCode: string): Promise<RawOecdFile> {
  const cached = dataCache.get(countryCode);
  if (cached) return cached;

  const fileUrl = COUNTRY_DATA_FILES[countryCode];
  if (!fileUrl) {
    throw new Error(`Ingen OECD-datafil registreret for landekoden "${countryCode}".`);
  }

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Kunne ikke hente OECD-data for ${countryCode} (HTTP ${response.status}).`);
  }

  const json = (await response.json()) as RawOecdFile;
  if (!json || !Array.isArray(json.years) || typeof json.dataMap !== 'object') {
    throw new Error(`Ugyldigt dataformat i OECD-filen for ${countryCode}.`);
  }

  dataCache.set(countryCode, json);
  return json;
}

export async function fetchCountrySummary(
  countryCode: string
): Promise<CountryEconomicSummary> {
  const cached = summaryCache.get(countryCode);
  if (cached) return cached;
  const raw = await fetchCountryOecdData(countryCode);
  const analyzed = analyzeCountryData(countryCode, raw);
  summaryCache.set(countryCode, analyzed);
  return analyzed;
}

function getLatestEntry(
  indicatorMap: Record<string, number | null | undefined> | undefined,
  years: number[],
  maxYear = 2025
): { year: number; value: number } | null {
  if (!indicatorMap) return null;
  const sorted = [...years].filter((y) => y <= maxYear).sort((a, b) => b - a);
  for (const year of sorted) {
    const val = toFiniteNumber(indicatorMap[String(year)]);
    if (val !== null) {
      return { year, value: val };
    }
  }
  return null;
}

function buildRecentRow(
  dataMap: RawOecdFile['dataMap'],
  code: string,
  labelDa: string,
  unit: string,
  targetYears = [2023, 2024, 2025]
): RecentMetricRow {
  const indicatorMap = dataMap?.[code] ?? {};
  return {
    code,
    labelDa,
    unit,
    values: targetYears.map((year) => ({
      year,
      value: toFiniteNumber(indicatorMap[String(year)]),
    })),
  };
}

function buildSnapshot(
  indicatorMap: Record<string, number | null | undefined> | undefined,
  years: number[],
  preferredRefYear = 2015,
  preferredLatestYear = 2025
): MetricSnapshot {
  if (!indicatorMap) {
    return {
      latestYear: null,
      latestValue: null,
      referenceYear: null,
      referenceValue: null,
      change: null,
      percentChange: null,
    };
  }

  const latest = getLatestEntry(indicatorMap, years, preferredLatestYear);

  let reference: { year: number; value: number } | null = null;
  const candidateRefVal = toFiniteNumber(indicatorMap[String(preferredRefYear)]);
  if (candidateRefVal !== null) {
    reference = { year: preferredRefYear, value: candidateRefVal };
  } else {
    const available = years
      .filter((y) => toFiniteNumber(indicatorMap[String(y)]) !== null && (!latest || y < latest.year))
      .sort((a, b) => Math.abs(a - preferredRefYear) - Math.abs(b - preferredRefYear));
    if (available.length > 0) {
      const y = available[0];
      const v = toFiniteNumber(indicatorMap[String(y)]);
      if (v !== null) reference = { year: y, value: v };
    }
  }

  const change = latest && reference ? latest.value - reference.value : null;
  const percentChange =
    latest && reference && reference.value !== 0
      ? ((latest.value - reference.value) / reference.value) * 100
      : null;

  return {
    latestYear: latest?.year ?? null,
    latestValue: latest?.value ?? null,
    referenceYear: reference?.year ?? null,
    referenceValue: reference?.value ?? null,
    change,
    percentChange,
  };
}

export function analyzeCountryData(
  countryCode: string,
  raw: RawOecdFile
): CountryEconomicSummary {
  const pdtyMap = raw.dataMap?.PDTY ?? {};
  const ulcdrMap = raw.dataMap?.ULCDR ?? {};
  const cpidrMap = raw.dataMap?.CPIDR ?? {};

  let missingYearsCount = 0;
  const series: ChartDataPoint[] = [];

  for (const year of raw.years) {
    const key = String(year);
    const pdty = toFiniteNumber(pdtyMap[key]);
    const ulcdr = toFiniteNumber(ulcdrMap[key]);
    const cpidr = toFiniteNumber(cpidrMap[key]);

    if (pdty === null && ulcdr === null && cpidr === null) {
      missingYearsCount += 1;
      continue;
    }

    series.push({ year, pdty, ulcdr, cpidr });
  }

  return {
    countryCode,
    series,
    pdty: buildSnapshot(pdtyMap, raw.years, 2015, 2025),
    ulcdr: buildSnapshot(ulcdrMap, raw.years, 2015, 2025),
    cpidr: buildSnapshot(cpidrMap, raw.years, 2015, 2025),
    latestInflation: getLatestEntry(raw.dataMap?.CPI_YTYPCT, raw.years, 2025),
    latestCurrentAccount: getLatestEntry(raw.dataMap?.CBGDPR, raw.years, 2025),
    latestGdpGrowth: getLatestEntry(raw.dataMap?.GDPV_ANNPCT, raw.years, 2025),
    latestUnemployment: getLatestEntry(raw.dataMap?.UNR, raw.years, 2025),
    latestPublicDebt: getLatestEntry(raw.dataMap?.GGFLMQ, raw.years, 2025),
    hintGroups: {
      pricesAndGrowth: [
        buildRecentRow(raw.dataMap, 'GDPV_ANNPCT', 'BNP-vækst', '%'),
        buildRecentRow(raw.dataMap, 'CPI_YTYPCT', 'Samlet inflation', '%'),
        buildRecentRow(raw.dataMap, 'PCORE_YTYPCT', 'Kerneinflation', '%'),
      ],
      laborAndDebt: [
        buildRecentRow(raw.dataMap, 'UNR', 'Arbejdsløshed', '%'),
        buildRecentRow(raw.dataMap, 'GGFLMQ', 'Offentlig gæld', '% af BNP'),
      ],
      externalBalance: [
        buildRecentRow(raw.dataMap, 'CBGDPR', 'Betalingsbalance', '% af BNP'),
        buildRecentRow(raw.dataMap, 'XGSV_ANNPCT', 'Eksportvækst', '%'),
        buildRecentRow(raw.dataMap, 'MGSV_ANNPCT', 'Importvækst', '%'),
      ],
    },
    missingYearsCount,
  };
}

export function formatDaNumber(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return '–';
  return value.toFixed(decimals).replace('.', ',');
}

export function formatSignedDaNumber(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return '–';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals).replace('.', ',')}`;
}

/**
 * Genererer en faktabaseret, kort dansk opsummering ud fra landets faktiske OECD-nøgletal.
 */
export function buildFactualEconomicSummary(
  countryNameDa: string,
  summary: CountryEconomicSummary
): string {
  const parts: string[] = [];

  if (summary.pdty.referenceValue !== null && summary.pdty.latestValue !== null) {
    const pct = summary.pdty.percentChange ?? 0;
    const direction =
      pct > 4 ? 'steget markant' : pct > 1 ? 'steget moderat' : pct < -2 ? 'faldet' : 'ligget næsten fladt';
    parts.push(
      `Fra ${summary.pdty.referenceYear} til ${summary.pdty.latestYear} er produktiviteten i ${countryNameDa} ${direction} fra ${formatDaNumber(summary.pdty.referenceValue, 2)} til ${formatDaNumber(summary.pdty.latestValue, 2)} (${formatSignedDaNumber(pct, 1)} %).`
    );
  }

  if (
    summary.ulcdr.referenceValue !== null &&
    summary.ulcdr.latestValue !== null &&
    summary.cpidr.referenceValue !== null &&
    summary.cpidr.latestValue !== null
  ) {
    const ulcDiff = summary.ulcdr.change ?? 0;
    const cpiDiff = summary.cpidr.change ?? 0;
    const compEval =
      cpiDiff >= 5
        ? 'hvilket peger på en mærkbar svækkelse af priskonkurrenceevnen'
        : cpiDiff <= -5
          ? 'hvilket peger på en tydelig forbedring af priskonkurrenceevnen'
          : 'hvilket afspejler en relativt stabil priskonkurrenceevne';

    parts.push(
      `I samme periode ændrede lønomkostningsindekset sig fra ${formatDaNumber(summary.ulcdr.referenceValue, 1)} til ${formatDaNumber(summary.ulcdr.latestValue, 1)} (${formatSignedDaNumber(ulcDiff, 1)} indekspoint), mens priskonkurrenceindekset gik fra ${formatDaNumber(summary.cpidr.referenceValue, 1)} til ${formatDaNumber(summary.cpidr.latestValue, 1)}, ${compEval}.`
    );
  }

  if (summary.latestCurrentAccount !== null || summary.latestInflation !== null) {
    const extras: string[] = [];
    if (summary.latestInflation !== null) {
      extras.push(
        `samlet inflation på ${formatDaNumber(summary.latestInflation.value, 1)} % (${summary.latestInflation.year})`
      );
    }
    if (summary.latestCurrentAccount !== null) {
      extras.push(
        `betalingsbalance på ${formatSignedDaNumber(summary.latestCurrentAccount.value, 1)} % af BNP (${summary.latestCurrentAccount.year})`
      );
    }
    if (summary.latestPublicDebt !== null) {
      extras.push(
        `offentlig gæld på ${formatDaNumber(summary.latestPublicDebt.value, 1)} % af BNP`
      );
    }
    parts.push(`Som makroøkonomisk bagtæppe registreres ${extras.join(', ')}.`);
  }

  return parts.join(' ');
}
