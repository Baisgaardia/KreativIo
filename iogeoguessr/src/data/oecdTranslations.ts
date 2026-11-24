/**
 * Danske oversættelser af OECD-landekoder, eurolande, EU-lande, valutaregimer og indikatorer.
 * Udledt direkte fra den uploadede oecd.html og de medfølgende OECD-datasæt.
 */

export interface IndicatorMeta {
  code: string;
  nameDa: string;
  shortNameDa: string;
  unit: string;
  baseNote: string;
  descriptionDa: string;
}

export const OECD_SOURCE_CITATION = 'OECD Economic Outlook, Volume 2026 Issue 1';

export const COUNTRY_NAMES_DA: Record<string, string> = {
  AUS: 'Australien',
  AUT: 'Østrig',
  BEL: 'Belgien',
  CAN: 'Canada',
  CHE: 'Schweiz',
  CHL: 'Chile',
  COL: 'Colombia',
  CZE: 'Tjekkiet',
  DEU: 'Tyskland',
  DNK: 'Danmark',
  ESP: 'Spanien',
  EST: 'Estland',
  FIN: 'Finland',
  FRA: 'Frankrig',
  GBR: 'Storbritannien',
  GRC: 'Grækenland',
  HUN: 'Ungarn',
  IRL: 'Irland',
  ISL: 'Island',
  ISR: 'Israel',
  ITA: 'Italien',
  JPN: 'Japan',
  KOR: 'Sydkorea',
  LTU: 'Litauen',
  LUX: 'Luxembourg',
  LVA: 'Letland',
  MEX: 'Mexico',
  NLD: 'Nederlandene',
  NOR: 'Norge',
  NZL: 'New Zealand',
  POL: 'Polen',
  PRT: 'Portugal',
  SVK: 'Slovakiet',
  SVN: 'Slovenien',
  SWE: 'Sverige',
  USA: 'USA',
};

export const EURO_COUNTRIES = new Set<string>([
  'AUT',
  'BEL',
  'EST',
  'FIN',
  'FRA',
  'DEU',
  'GRC',
  'IRL',
  'ITA',
  'LVA',
  'LTU',
  'LUX',
  'NLD',
  'PRT',
  'SVK',
  'SVN',
  'ESP',
]);

export const EU_COUNTRIES = new Set<string>([
  ...EURO_COUNTRIES,
  'DNK',
  'CZE',
  'HUN',
  'POL',
  'SWE',
]);

export const CATCHUP_EAST_EUROPE = new Set<string>([
  'CZE',
  'EST',
  'HUN',
  'LTU',
  'LVA',
  'POL',
  'SVK',
  'SVN',
]);

export const NON_EUROPE_COUNTRIES = new Set<string>([
  'AUS',
  'CAN',
  'CHL',
  'COL',
  'ISR',
  'JPN',
  'KOR',
  'MEX',
  'NZL',
  'USA',
]);

/**
 * Kortlægning fra 3-bogstavs OECD-landekode til den lokale JSON-datafil.
 * Omfatter de 36 OECD-lande med komplette datasæt for PDTY, ULCDR og CPIDR
 * (Costa Rica og Tyrkiet er udeladt pga. manglende serier).
 */
export const COUNTRY_DATA_FILES: Record<string, string> = {
  AUS: '/assets/aistudio/AUS_72e06418.json',
  AUT: '/assets/aistudio/AUT_9dd81c47.json',
  BEL: '/assets/aistudio/BEL_4032c4c2.json',
  CAN: '/assets/aistudio/CAN_57a0a58f.json',
  CHE: '/assets/aistudio/CHE_70c2c97d.json',
  CHL: '/assets/aistudio/CHL_5f810004.json',
  COL: '/assets/aistudio/COL_0114214b.json',
  CZE: '/assets/aistudio/CZE_e2736c0e.json',
  DEU: '/assets/aistudio/DEU_fa3d54ad.json',
  DNK: '/assets/aistudio/DNK_738dc38e.json',
  ESP: '/assets/aistudio/ESP_7b886c6d.json',
  EST: '/assets/aistudio/EST_e0de5aae.json',
  FIN: '/assets/aistudio/FIN_d1b88e35.json',
  FRA: '/assets/aistudio/FRA_fae0c3c7.json',
  GBR: '/assets/aistudio/GBR_e76f9987.json',
  GRC: '/assets/aistudio/GRC_f5542654.json',
  HUN: '/assets/aistudio/HUN_49750666.json',
  IRL: '/assets/aistudio/IRL_f9cd7993.json',
  ISL: '/assets/aistudio/ISL_f2970a50.json',
  ISR: '/assets/aistudio/ISR_0426059c.json',
  ITA: '/assets/aistudio/ITA_55296a26.json',
  JPN: '/assets/aistudio/JPN_4b47ba6a.json',
  KOR: '/assets/aistudio/KOR_ca1b27c7.json',
  LTU: '/assets/aistudio/LTU_9c24839c.json',
  LUX: '/assets/aistudio/LUX_beb9c7e0.json',
  LVA: '/assets/aistudio/LVA_763de04d.json',
  MEX: '/assets/aistudio/MEX_440e4d17.json',
  NLD: '/assets/aistudio/NLD_7b840060.json',
  NOR: '/assets/aistudio/NOR_46731db9.json',
  NZL: '/assets/aistudio/NZL_05580973.json',
  POL: '/assets/aistudio/POL_efd2bb8b.json',
  PRT: '/assets/aistudio/PRT_36691e67.json',
  SVK: '/assets/aistudio/SVK_8b33b862.json',
  SVN: '/assets/aistudio/SVN_9a4bac8c.json',
  SWE: '/assets/aistudio/SWE_41d4e86f.json',
  USA: '/assets/aistudio/USA_a4841bff.json',
};

export const INDICATOR_META: Record<string, IndicatorMeta> = {
  PDTY: {
    code: 'PDTY',
    nameDa: 'Produktivitet (volumenindeks)',
    shortNameDa: 'Produktivitet',
    unit: 'indeks (2021 = 1,00)',
    baseNote: '2021 = 1,00',
    descriptionDa:
      'Måler produktion pr. beskæftiget/arbejdstime i faste priser. Stigende kurve betyder højere effektivitet og bedre grundlag for konkurrenceevnen.',
  },
  ULCDR: {
    code: 'ULCDR',
    nameDa: 'Lønomkostninger, indeks 2021',
    shortNameDa: 'Lønomkostninger',
    unit: 'indeks (2021 = 100)',
    baseNote: '2021 = 100',
    descriptionDa:
      'Relative enhedslønomkostninger i fælles valuta. Stigende kurve betyder, at lønomkostningerne stiger hurtigere end hos samhandelspartnerne (svækket konkurrenceevne).',
  },
  CPIDR: {
    code: 'CPIDR',
    nameDa: 'Priskonkurrence, indeks 2021',
    shortNameDa: 'Priskonkurrenceevne',
    unit: 'indeks (2021 = 100)',
    baseNote: '2021 = 100',
    descriptionDa:
      'Relativt prisniveau i fælles valuta (real effektiv valutakurs). Et fald i indekset viser forbedret priskonkurrenceevne; en stigning viser forringet priskonkurrenceevne.',
  },
  GDPV_ANNPCT: {
    code: 'GDPV_ANNPCT',
    nameDa: 'Økonomisk vækst',
    shortNameDa: 'BNP-vækst',
    unit: '%',
    baseNote: 'årlig realvækst',
    descriptionDa: 'Årlig procentvis vækst i realt BNP.',
  },
  CPI_YTYPCT: {
    code: 'CPI_YTYPCT',
    nameDa: 'Samlet inflation',
    shortNameDa: 'Samlet inflation',
    unit: '%',
    baseNote: 'årlig ændring',
    descriptionDa: 'Årlig procentvis stigning i forbrugerprisindekset.',
  },
  PCORE_YTYPCT: {
    code: 'PCORE_YTYPCT',
    nameDa: 'Kerneinflation',
    shortNameDa: 'Kerneinflation',
    unit: '%',
    baseNote: 'ekskl. energi og fødevarer',
    descriptionDa: 'Underliggende prisstigning ekskl. volatile energi- og fødevarepriser.',
  },
  UNR: {
    code: 'UNR',
    nameDa: 'Arbejdsløshedsprocenten',
    shortNameDa: 'Arbejdsløshed',
    unit: '%',
    baseNote: 'andel af arbejdsstyrken',
    descriptionDa: 'Arbejdsløshed i procent af arbejdsstyrken.',
  },
  CBGDPR: {
    code: 'CBGDPR',
    nameDa: 'Betalingsbalancen i % af BNP',
    shortNameDa: 'Betalingsbalance',
    unit: '% af BNP',
    baseNote: 'løbende poster',
    descriptionDa: 'Betalingsbalancens løbende poster opgjort i procent af BNP.',
  },
  GGFLMQ: {
    code: 'GGFLMQ',
    nameDa: 'Offentlig gæld i % af BNP',
    shortNameDa: 'Offentlig gæld',
    unit: '% af BNP',
    baseNote: 'bruttogæld',
    descriptionDa: 'Den samlede offentlige sektors bruttogæld i procent af BNP.',
  },
  XGSV_ANNPCT: {
    code: 'XGSV_ANNPCT',
    nameDa: 'Eksport',
    shortNameDa: 'Eksportvækst',
    unit: '%',
    baseNote: 'årlig realvækst',
    descriptionDa: 'Årlig procentvis realvækst i eksport af varer og tjenester.',
  },
  MGSV_ANNPCT: {
    code: 'MGSV_ANNPCT',
    nameDa: 'Import',
    shortNameDa: 'Importvækst',
    unit: '%',
    baseNote: 'årlig realvækst',
    descriptionDa: 'Årlig procentvis realvækst i import af varer og tjenester.',
  },
};

export function getCountryNameDa(countryCode: string): string {
  return COUNTRY_NAMES_DA[countryCode] ?? countryCode;
}

export function isFixedOrEuroRegime(countryCode: string): boolean {
  return EURO_COUNTRIES.has(countryCode) || countryCode === 'DNK';
}

export function getCurrencyRegimeLabel(countryCode: string): string {
  if (EURO_COUNTRIES.has(countryCode)) {
    return 'Eurozone (EUR – fælles valuta / fast kurs i ØMU)';
  }
  if (countryCode === 'DNK') {
    return 'Fastkurspolitik over for euro (DKK / ERM II)';
  }
  const floatingCurrencies: Record<string, string> = {
    AUS: 'Flydende valuta (AUD – australsk dollar)',
    CAN: 'Flydende valuta (CAD – canadisk dollar)',
    CHE: 'Flydende valuta (CHF – schweizerfranc)',
    CHL: 'Flydende valuta (CLP – chilensk peso)',
    COL: 'Flydende valuta (COP – colombiansk peso)',
    CZE: 'Flydende valuta (CZK – tjekkisk koruna)',
    GBR: 'Flydende valuta (GBP – britisk pund)',
    HUN: 'Flydende valuta (HUF – ungarsk forint)',
    ISL: 'Flydende valuta (ISK – islandsk krone)',
    ISR: 'Flydende valuta (ILS – israelsk shekel)',
    JPN: 'Flydende valuta (JPY – japansk yen)',
    KOR: 'Flydende valuta (KRW – sydkoreansk won)',
    MEX: 'Flydende valuta (MXN – mexicansk peso)',
    NOR: 'Flydende valuta (NOK – norsk krone)',
    NZL: 'Flydende valuta (NZD – newzealandsk dollar)',
    POL: 'Flydende valuta (PLN – polsk zloty)',
    SWE: 'Flydende valuta (SEK – svensk krone)',
    USA: 'Flydende valuta (USD – amerikansk dollar)',
  };
  return floatingCurrencies[countryCode] ?? 'Flydende egen valuta';
}
