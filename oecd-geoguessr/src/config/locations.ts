/**
 * ============================================================================
 * LÆRERKONFIGURATION: LOCATIONS (36 KOMPLETTE OECD-LANDE)
 * ============================================================================
 * Alle 36 OECD-lande fra datasættet, som har komplette tidsserier for både
 * Produktivitet (PDTY), Lønomkostninger (ULCDR) og Priskonkurrence (CPIDR).
 * (Costa Rica og Tyrkiet er udeladt pga. manglende dataserier.)
 *
 * SÅDAN UDSKIFTER DU EN GOOGLE STREET VIEW-IFRAME:
 * 1. Åbn Google Maps og slip den gule Street View-mand på en anonym vej.
 * 2. Klik på de tre prikker -> "Del eller indlejr billede" -> "Indlejr et kort".
 * 3. Kopiér HTML-koden eller src-URL'en og indsæt den her i `streetViewEmbedUrl`
 *    (eller hurtigt via knappen "Lærer: Lokationer" på startskærmen).
 * ============================================================================
 */

import {
  CATCHUP_EAST_EUROPE,
  EU_COUNTRIES,
  EURO_COUNTRIES,
  isFixedOrEuroRegime,
  NON_EUROPE_COUNTRIES,
} from '../data/oecdTranslations';

export interface GameLocation {
  id: string;
  countryCode: string;
  areaLabel: string;
  lat: number;
  lng: number;
  streetViewEmbedUrl: string;
  reflectionQuestion: string;
}

export type ThemePackId =
  | 'all'
  | 'eurozone'
  | 'floating'
  | 'eu'
  | 'catchup'
  | 'non_europe';

export interface ThemePack {
  id: ThemePackId;
  shortCode: string;
  nameDa: string;
  descriptionDa: string;
  filter: (loc: GameLocation) => boolean;
}

export const THEME_PACKS: ThemePack[] = [
  {
    id: 'all',
    shortCode: 'ALL',
    nameDa: 'Hele OECD (36 lande)',
    descriptionDa:
      'Alle 36 OECD-lande med komplette datasæt for produktivitet, lønomkostninger og priskonkurrence.',
    filter: () => true,
  },
  {
    id: 'eurozone',
    shortCode: 'EUZ',
    nameDa: 'Eurozonen (17 lande)',
    descriptionDa: 'Lande med fælles valuta (EUR) – fokus på intern devaluering og løn/produktivitet.',
    filter: (loc) => EURO_COUNTRIES.has(loc.countryCode),
  },
  {
    id: 'floating',
    shortCode: 'FLY',
    nameDa: 'Flydende valutaer (18 lande)',
    descriptionDa: 'Lande med egen flydende valuta – fokus på samspillet mellem valutakurs og priskonkurrence.',
    filter: (loc) => !isFixedOrEuroRegime(loc.countryCode),
  },
  {
    id: 'eu',
    shortCode: 'EUL',
    nameDa: 'EU-lande (22 lande)',
    descriptionDa: 'Både eurolande, Danmark (fastkurs) og EU-lande med egen valuta.',
    filter: (loc) => EU_COUNTRIES.has(loc.countryCode),
  },
  {
    id: 'catchup',
    shortCode: 'OST',
    nameDa: 'Østeuropa & Baltikum (8 lande)',
    descriptionDa: 'Indhentningsøkonomier med stærk produktivitetsvækst, høj lønvækst og real appreciering.',
    filter: (loc) => CATCHUP_EAST_EUROPE.has(loc.countryCode),
  },
  {
    id: 'non_europe',
    shortCode: 'VER',
    nameDa: 'OECD uden for Europa (10 lande)',
    descriptionDa: 'Nord- og Sydamerika, Asien og Oceanien – store valutakurssvingninger og globale handelsstrømme.',
    filter: (loc) => NON_EUROPE_COUNTRIES.has(loc.countryCode),
  },
];

function buildStreetViewUrl(
  panoId: string,
  lat: number,
  lng: number,
  heading = 0
): string {
  return `https://www.google.com/maps/embed?pb=!4v1700000000000!6m8!1m7!1s${panoId}!2m2!1d${lat.toFixed(6)}!2d${lng.toFixed(6)}!3f${heading}!4f0!5f0.7820865974627469`;
}

export const LOCATIONS: GameLocation[] = [
  {
    id: 'aus-dandenong',
    countryCode: 'AUS',
    areaLabel: 'Dandenong South erhvervs- og industriområde, Victoria',
    lat: -38.01882,
    lng: 145.217053,
    streetViewEmbedUrl: buildStreetViewUrl('X-ywHx3zx73C7YR7-YcPvg', -38.01882, 145.217053, 279),
    reflectionQuestion:
      'Australiens produktivitet har ligget næsten fladt siden 2015, mens lønomkostningsindekset stiger moderat. Hvordan påvirker råvareeksport og en flydende valuta (AUD) priskonkurrenceevnen?',
  },
  {
    id: 'aut-wiener-neudorf',
    countryCode: 'AUT',
    areaLabel: 'Industriezentrum NÖ-Süd ved A2, Niederösterreich',
    lat: 48.074263,
    lng: 16.316226,
    streetViewEmbedUrl: buildStreetViewUrl('kpjYbWH2mVBGaVa-m-K98Q', 48.074263, 16.316226, 132),
    reflectionQuestion:
      'Østrig er et euroland med tæt samhandel med Tyskland. Hvordan påvirker stigende priskonkurrence- og lønomkostningsindeks efter 2021 østrigsk eksport, når valutakursen er fastlåst i euroen?',
  },
  {
    id: 'bel-vilvoorde',
    countryCode: 'BEL',
    areaLabel: 'Vilvoorde erhvervs- og logistikkorridor ved E19, nord for Bruxelles',
    lat: 50.92859,
    lng: 4.426586,
    streetViewEmbedUrl: buildStreetViewUrl('g0l41Z8eMgsg2DsvmVceFg', 50.92859, 4.426586, 36),
    reflectionQuestion:
      'Belgien har automatisk lønindeksering ved inflation, men viser også produktivitetsfremgang. Hvordan ses balancen mellem lønpres og produktivitet i landets kurver for lønomkostninger og priskonkurrence?',
  },
  {
    id: 'can-mississauga',
    countryCode: 'CAN',
    areaLabel: 'Mississauga erhvervskorridor ved Highway 401, Ontario',
    lat: 43.65396,
    lng: -79.669088,
    streetViewEmbedUrl: buildStreetViewUrl('fvIEdBRIV8YhDwYDNxiOaQ', 43.65396, -79.669088, 316),
    reflectionQuestion:
      'Canadas priskonkurrence- og lønomkostningsindeks falder mærkbart mod 2025 trods beskeden produktivitetsvækst. Hvilken rolle spiller den canadiske dollar (CAD) i forhold til USA?',
  },
  {
    id: 'che-spreitenbach',
    countryCode: 'CHE',
    areaLabel: 'Spreitenbach erhvervsområde, Aargau',
    lat: 47.420889,
    lng: 8.367472,
    streetViewEmbedUrl: buildStreetViewUrl('Z2xbsQjbl-H1ceZPmICHJQ', 47.420889, 8.367472, 158),
    reflectionQuestion:
      'Schweiz har både lav inflation, en stærk schweizerfranc (CHF) og et stort overskud på betalingsbalancen. Hvordan kan et land med højt omkostningsniveau alligevel klare sig stærkt i eksporten?',
  },
  {
    id: 'chl-quilicura',
    countryCode: 'CHL',
    areaLabel: 'Quilicura industri- og logistikpark, Santiago-området',
    lat: -33.346779,
    lng: -70.713283,
    streetViewEmbedUrl: buildStreetViewUrl('g_6SeUf1F1JVdQf7I2o_hw', -33.346779, -70.713283, 356),
    reflectionQuestion:
      'I Chile stiger lønomkostningsindekset markant frem mod 2025, mens priskonkurrenceindekset falder i forhold til 2015. Hvordan kan udsving i en flydende valuta (CLP) og råvarepriser skabe forskel på de to indeks?',
  },
  {
    id: 'col-funza',
    countryCode: 'COL',
    areaLabel: 'Funza industrikorridor vest for Bogotá',
    lat: 4.718067,
    lng: -74.205417,
    streetViewEmbedUrl: buildStreetViewUrl('e9m41I13LSHc7ZMuULyLbA', 4.718067, -74.205417, 154),
    reflectionQuestion:
      'Colombia har haft relativt høj inflation og et højt niveau i både lønomkostninger og priskonkurrenceindeks i 2025. Hvordan kan vedvarende høj inflation svække priskonkurrenceevnen, selv når landet har en flydende valuta (COP)?',
  },
  {
    id: 'cze-plzen',
    countryCode: 'CZE',
    areaLabel: 'Borská pole industripark, Plzeň',
    lat: 49.726513,
    lng: 13.333591,
    streetViewEmbedUrl: buildStreetViewUrl('oqOdMrAmHdkk8JtuwZsz8A', 49.726513, 13.333591, 273),
    reflectionQuestion:
      'Tjekkiet har haft stærk produktivitetsindhentning, men siden 2015 stiger både lønomkostninger og priskonkurrenceindeks kraftigt. Hvordan kan høj inflation og en styrket koruna (CZK) presse eksportindustrien?',
  },
  {
    id: 'deu-hannover',
    countryCode: 'DEU',
    areaLabel: 'Langenhagen logistik- og erhvervszone, Niedersachsen',
    lat: 52.441026,
    lng: 9.713785,
    streetViewEmbedUrl: buildStreetViewUrl('iOdYy3fAZ52YvMnvhCufxw', 52.441026, 9.713785, 277),
    reflectionQuestion:
      'Hvordan hænger den flade produktivitetsudvikling og de stigende relative lønomkostninger efter 2021 sammen med Tysklands priskonkurrenceevne som euroland?',
  },
  {
    id: 'dnk-taastrup',
    countryCode: 'DNK',
    areaLabel: 'Høje-Taastrup erhvervsområde, Sjælland',
    lat: 55.654914,
    lng: 12.289341,
    streetViewEmbedUrl: buildStreetViewUrl('-ugqn39llgNa1KKqbEv9kQ', 55.654914, 12.289341, 261),
    reflectionQuestion:
      'Danmark fører fastkurspolitik over for euroen. Hvordan har udviklingen i produktivitet og lønomkostninger påvirket priskonkurrenceevnen og betalingsbalancen, når kronen ikke kan devalueres?',
  },
  {
    id: 'esp-getafe',
    countryCode: 'ESP',
    areaLabel: 'Polígono Industrial Los Ángeles, syd for Madrid',
    lat: 40.312598,
    lng: -3.701771,
    streetViewEmbedUrl: buildStreetViewUrl('0Gw9BgXfXxG87OqAy9SJzw', 40.312598, -3.701771, 180),
    reflectionQuestion:
      'Spanien forbedrede sin priskonkurrenceevne markant efter finanskrisen, men fra 2015 til 2025 stiger lønomkostningsindekset igen. Hvordan begrænser medlemskabet af eurozonen Spaniens valg af økonomisk politik?',
  },
  {
    id: 'est-rae',
    countryCode: 'EST',
    areaLabel: 'Jüri teknologipark ved Tallinn-ringvejen',
    lat: 59.355011,
    lng: 24.887915,
    streetViewEmbedUrl: buildStreetViewUrl('gG3JsucKc0Y-UTEqA-Be5Q', 59.355011, 24.887915, 120),
    reflectionQuestion:
      'Estland er et lille euroland, hvor både lønomkostnings- og priskonkurrenceindekset stiger over 15 indekspoint fra 2015 til 2025. Hvorfor er høj indenlandsk inflation særligt risikabel for konkurrenceevnen i et euroland?',
  },
  {
    id: 'fin-jarvenpaa',
    countryCode: 'FIN',
    areaLabel: 'Järvenpää erhvervs- og industriområde nord for Helsinki, Uusimaa',
    lat: 60.47135,
    lng: 25.095512,
    streetViewEmbedUrl: buildStreetViewUrl('0yYijiozKkAbEh8z1sL7zg', 60.47135, 25.095512, 128),
    reflectionQuestion:
      'Finland har dæmpet sine relative lønomkostninger siden 2015, men produktiviteten er næsten uændret. Hvorfor kan løntilbageholdenhed alene være utilstrækkelig til at sikre langsigtet vækst?',
  },
  {
    id: 'fra-orleans',
    countryCode: 'FRA',
    areaLabel: 'Saran logistik- og erhvervsområde, Loiret',
    lat: 47.951009,
    lng: 1.878735,
    streetViewEmbedUrl: buildStreetViewUrl('ne1b6xvSU2TKpNYUHjxKmQ', 47.951009, 1.878735, 240),
    reflectionQuestion:
      'Frankrig har fået sænket sine relative lønomkostninger siden 2015 i eurozonen, men har fortsat høj offentlig gæld. Hvilke strukturpolitiske tiltag kan styrke produktiviteten?',
  },
  {
    id: 'gbr-milton-keynes',
    countryCode: 'GBR',
    areaLabel: 'Milton Keynes erhvervskorridor, Buckinghamshire',
    lat: 52.040686,
    lng: -0.759619,
    streetViewEmbedUrl: buildStreetViewUrl('I3mgFw565ZzDWl4XL9b-Qg', 52.040686, -0.759619, 6),
    reflectionQuestion:
      'Storbritannien har egen flydende valuta (GBP) og oplevede efter 2016 store valutakurssvingninger. Hvordan ses samspillet mellem pundets kurs, inflation og priskonkurrenceevne i graferne?',
  },
  {
    id: 'grc-aspropyrgos',
    countryCode: 'GRC',
    areaLabel: 'Aspropyrgos industriområde, Attika',
    lat: 38.062262,
    lng: 23.586082,
    streetViewEmbedUrl: buildStreetViewUrl('CugjOZpPtGgEsmJXx3q46Q', 38.062262, 23.586082, 198),
    reflectionQuestion:
      'Grækenland kunne ikke devaluere sin valuta under gældskrisen. Hvordan ses "intern devaluering" i kurverne for lønomkostninger, produktivitet og priskonkurrenceevne?',
  },
  {
    id: 'hun-gyor',
    countryCode: 'HUN',
    areaLabel: 'Győr industri- og erhvervspark ved M1',
    lat: 47.69517,
    lng: 17.680303,
    streetViewEmbedUrl: buildStreetViewUrl('L98GwEl82DIUlpLEJlfssg', 47.69517, 17.680303, 303),
    reflectionQuestion:
      'Ungarns relative lønomkostninger stiger kraftigt efter 2021. Hvordan påvirker høj inflation og lønpres priskonkurrenceevnen – og kan en svækkelse af forinten (HUF) fuldt ud kompensere for det?',
  },
  {
    id: 'irl-blanchardstown',
    countryCode: 'IRL',
    areaLabel: 'Blanchardstown erhvervspark ved M50, Dublin-området',
    lat: 53.400989,
    lng: -6.36447,
    streetViewEmbedUrl: buildStreetViewUrl('mHgd3bo5HD3a4vVEjqdH6w', 53.400989, -6.36447, 58),
    reflectionQuestion:
      'Irland skiller sig ud med en eksplosiv stigning i produktivitet og faldende relative lønomkostninger. Hvordan kan store multinationale selskaber påvirke både produktivitetstal og betalingsbalance?',
  },
  {
    id: 'isl-hafnarfjordur',
    countryCode: 'ISL',
    areaLabel: 'Vellir erhvervs- og industriområde, Hafnarfjörður',
    lat: 64.054135,
    lng: -21.970338,
    streetViewEmbedUrl: buildStreetViewUrl('qmctr2xx1NKrSH3ACLpVRg', 64.054135, -21.970338, 69),
    reflectionQuestion:
      'Island er en meget lille, åben økonomi med egen flydende valuta (ISK). Hvordan påvirker kraftig turismevækst og en styrket krone både lønomkostningsindekset og priskonkurrenceevnen?',
  },
  {
    id: 'isr-petah-tikva',
    countryCode: 'ISR',
    areaLabel: 'Kiryat Aryeh erhvervs- og teknologizone, Petah Tikva',
    lat: 32.101048,
    lng: 34.859682,
    streetViewEmbedUrl: buildStreetViewUrl('Y_KHPfEW7onVizrJhrt8vg', 32.101048, 34.859682, 138),
    reflectionQuestion:
      'Israel viser høj produktivitetsvækst fra 2015 til 2025, samtidig med at både lønomkostnings- og priskonkurrenceindekset er steget. Hvordan kan stærk højteknologisk eksport styrke valutaen (ILS) og presse andre eksportbrancher?',
  },
  {
    id: 'ita-bologna',
    countryCode: 'ITA',
    areaLabel: 'Erhvervs- og trafikkorridor ved A14, Bologna',
    lat: 44.526488,
    lng: 11.356304,
    streetViewEmbedUrl: buildStreetViewUrl('Tk971bfgfKtHIB9QlUkzlQ', 44.526488, 11.356304, 301),
    reflectionQuestion:
      'Italiens produktivitet har stort set stået stille i et årti, mens lønomkostningsindekset kun er faldet svagt. Hvilke udfordringer skaber lav produktivitetsvækst kombineret med høj offentlig gæld i eurozonen?',
  },
  {
    id: 'jpn-atsugi',
    countryCode: 'JPN',
    areaLabel: 'Atsugi industri- og forstadsvej, Kanagawa',
    lat: 35.435422,
    lng: 139.35747,
    streetViewEmbedUrl: buildStreetViewUrl('S_xFtsqbdNKj75KVxMoI1Q', 35.435422, 139.35747, 94),
    reflectionQuestion:
      'Japans priskonkurrence- og lønomkostningsindeks falder dramatisk i hele perioden. Hvordan spiller lav inflation og en kraftigt svækket yen (JPY) ind på landets internationale konkurrenceevne?',
  },
  {
    id: 'kor-seoul-seongsu',
    countryCode: 'KOR',
    areaLabel: 'Seongsu erhvervs- og industriområde, Seoul',
    lat: 37.540125,
    lng: 127.070339,
    streetViewEmbedUrl: buildStreetViewUrl('NRT252JxBS7fRBTjcDVFlw', 37.540125, 127.070339, 293),
    reflectionQuestion:
      'Sydkorea kombinerer solid produktivitetsvækst med faldende lønomkostninger og forbedret priskonkurrence fra 2015 til 2025. Hvordan understøtter dette landets eksportdrevne vækstmodel og betalingsbalanceoverskud?',
  },
  {
    id: 'ltu-kaunas',
    countryCode: 'LTU',
    areaLabel: 'Kaunas frie økonomiske zone ved A1',
    lat: 54.939353,
    lng: 24.018027,
    streetViewEmbedUrl: buildStreetViewUrl('iq7dxCosLGczf-eWTrUuDg', 54.939353, 24.018027, 66),
    reflectionQuestion:
      'Litauen har haft stærk produktivitetsvækst siden 2015, men lønomkostningerne er steget endnu hurtigere. Hvor længe kan et euroland have højere lønvækst end nabolandene, før eksporten rammes?',
  },
  {
    id: 'lux-bettembourg',
    countryCode: 'LUX',
    areaLabel: 'Bettembourg logistik- og erhvervszone ved A3',
    lat: 49.503772,
    lng: 6.092048,
    streetViewEmbedUrl: buildStreetViewUrl('3d5E6O3qF6-nk1xKQ8bfXw', 49.503772, 6.092048, 256),
    reflectionQuestion:
      'Luxembourg viser et fald i produktivitetsindekset og stigende relative lønomkostninger efter 2021. Hvordan kan automatisk lønindeksering i en lille tjenestebaseret økonomi påvirke enhedslønomkostningerne?',
  },
  {
    id: 'lva-marupe',
    countryCode: 'LVA',
    areaLabel: 'Mārupe erhvervs- og logistikområde sydvest for Riga',
    lat: 56.905606,
    lng: 24.027492,
    streetViewEmbedUrl: buildStreetViewUrl('HLhmOUtE_vy8wRCrCTVU7A', 56.905606, 24.027492, 262),
    reflectionQuestion:
      'Letland har haft betydelig produktivitetsindhentning i eurozonen, men oplever samtidig kraftig vækst i lønomkostnings- og priskonkurrenceindekset efter 2021. Hvordan afspejles det på betalingsbalancen?',
  },
  {
    id: 'mex-queretaro',
    countryCode: 'MEX',
    areaLabel: 'Parque Industrial Bernardo Quintana, Querétaro',
    lat: 20.572755,
    lng: -100.28226,
    streetViewEmbedUrl: buildStreetViewUrl('_dmrxV2oSE8a8VpILB9xpg', 20.572755, -100.28226, 177),
    reflectionQuestion:
      'Mexicos lønomkostningsindeks stiger kraftigt mod 2025 trods faldende produktivitet. Hvordan kan en stærkere peso (MXN) og højere indenlandske lønninger påvirke Mexicos rolle som produktionsland for USA?',
  },
  {
    id: 'nld-tilburg',
    countryCode: 'NLD',
    areaLabel: 'Vossenberg logistikpark, Tilburg',
    lat: 51.592459,
    lng: 5.004293,
    streetViewEmbedUrl: buildStreetViewUrl('2LTq_3HvvvhNWrwTmlqz0Q', 51.592459, 5.004293, 118),
    reflectionQuestion:
      'Nederlandene har oplevet stigende relative priser og lønomkostninger siden 2015, men har stadig et stort betalingsbalanceoverskud. Hvilke andre faktorer end pris styrker hollandsk konkurrenceevne?',
  },
  {
    id: 'nor-gardermoen',
    countryCode: 'NOR',
    areaLabel: 'Jessheim erhvervs- og trafikkorridor ved E6, Akershus',
    lat: 60.141139,
    lng: 11.174508,
    streetViewEmbedUrl: buildStreetViewUrl('pBZ0KCjNODZQxL4o1OFZug', 60.141139, 11.174508, 146),
    reflectionQuestion:
      'Norges lønomkostnings- og priskonkurrenceindeks falder markant fra 2015 til 2025, samtidig med at betalingsbalanceoverskuddet er enormt. Hvordan har en svækket norsk krone (NOK) gavnet norsk fastlandseksport?',
  },
  {
    id: 'nzl-auckland',
    countryCode: 'NZL',
    areaLabel: 'Highbrook erhvervs- og industripark, Auckland',
    lat: -36.941334,
    lng: 174.872482,
    streetViewEmbedUrl: buildStreetViewUrl('ZWHV-7ndaIARdMYCgfTRHA', -36.941334, 174.872482, 336),
    reflectionQuestion:
      'New Zealand har en flydende valuta (NZD) og relativt stabile konkurrenceindeks fra 2015 til 2025, men et tydeligt underskud på betalingsbalancen. Hvad kan forklare underskuddet på trods af en stabil priskonkurrenceevne?',
  },
  {
    id: 'pol-strykow',
    countryCode: 'POL',
    areaLabel: 'Stryków logistikpark ved A2-korridoren',
    lat: 51.887193,
    lng: 19.588755,
    streetViewEmbedUrl: buildStreetViewUrl('ZAbHB11-ELH9h6xDj1nAPg', 51.887193, 19.588755, 250),
    reflectionQuestion:
      'Polen har haft en markant produktivitetsstigning, men både lønomkostnings- og priskonkurrenceindekset stiger kraftigt efter 2021. Hvad kan forklare dette samspil mellem lønvækst, inflation og valutakurs (PLN)?',
  },
  {
    id: 'prt-maia',
    countryCode: 'PRT',
    areaLabel: 'Zona Industrial da Maia nord for Porto',
    lat: 41.24236,
    lng: -8.637867,
    streetViewEmbedUrl: buildStreetViewUrl('mY8Az4I6dtqGSAonZC5soQ', 41.24236, -8.637867, 168),
    reflectionQuestion:
      'Portugal har øget produktiviteten fra 2015 til 2025, men relative lønomkostninger stiger tydeligt efter 2021. Hvordan påvirker udviklingen i turisme og industri Portugals priskonkurrenceevne i eurozonen?',
  },
  {
    id: 'svk-trnava',
    countryCode: 'SVK',
    areaLabel: 'Trnava erhvervs- og industriområde ved D1',
    lat: 48.368767,
    lng: 17.601884,
    streetViewEmbedUrl: buildStreetViewUrl('onUQiKqoYZzryKCm407caA', 48.368767, 17.601884, 54),
    reflectionQuestion:
      'Slovakiet er et stærkt eksportorienteret euroland med stor bilindustri. Hvorfor kan kombinationen af stigende lønomkostnings- og priskonkurrenceindeks og fast eurokurs gøre landet sårbart over for konkurrence fra nabolande med egen valuta?',
  },
  {
    id: 'svn-ljubljana',
    countryCode: 'SVN',
    areaLabel: 'BTC erhvervs- og logistikområde, Ljubljana',
    lat: 46.085262,
    lng: 14.543893,
    streetViewEmbedUrl: buildStreetViewUrl('LsrW37r_Tzkksm_0NY5ueA', 46.085262, 14.543893, 94),
    reflectionQuestion:
      'Slovenien viser solid produktivitetsfremgang siden 2015, men relative lønomkostninger stiger endnu hurtigere mod 2025. Hvordan påvirker lønvækst over produktivitetsvækst konkurrenceevnen i et euroland?',
  },
  {
    id: 'swe-jonkoping',
    countryCode: 'SWE',
    areaLabel: 'Torsvik logistikområde ved E4',
    lat: 57.683143,
    lng: 14.164125,
    streetViewEmbedUrl: buildStreetViewUrl('j3U8hILh70wWCgi3LddYTw', 57.683143, 14.164125, 337),
    reflectionQuestion:
      'Sveriges priskonkurrence- og lønomkostningsindeks falder mærkbart gennem perioden trods moderat produktivitetsvækst. Hvilken rolle spiller den flydende svenske krone (SEK) for eksportvirksomhederne?',
  },
  {
    id: 'usa-columbus',
    countryCode: 'USA',
    areaLabel: 'Rickenbacker erhvervskorridor, Ohio',
    lat: 39.83664,
    lng: -82.933355,
    streetViewEmbedUrl: buildStreetViewUrl('atUYOIbfp-S_Vrpbv0sXlw', 39.83664, -82.933355, 359),
    reflectionQuestion:
      'USA viser vedvarende produktivitetsvækst, men priskonkurrenceindekset stiger alligevel markant over tid. Hvordan kan en stærk dollar (USD) modvirke gevinsten fra højere produktivitet?',
  },
];
