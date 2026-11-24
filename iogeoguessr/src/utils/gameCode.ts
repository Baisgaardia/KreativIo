/**
 * Deterministisk spilkode- og seed-system til fælles klassedyst uden server/database.
 * Koden indkoder temapakke, antal runder, timer og seed, så hele klassen får præcis
 * de samme lande i samme rækkefølge.
 */

import { THEME_PACKS, ThemePackId } from '../config/locations';

export interface ClassGameSettings {
  packId: ThemePackId;
  roundCount: number;
  timerSeconds: number;
  seed: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * FNV-1a 32-bit strenghash til deterministisk konvertering af kodeord til tal-seed.
 */
function hashStringToUint32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 deterministisk pseudo-tilfældig talgenerator.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Blander en liste deterministisk ud fra en tekst-seed (eller tilfældigt hvis seed er tom).
 */
export function seededShuffle<T>(items: T[], seed?: string): T[] {
  const copy = [...items];
  const rand =
    seed && seed.trim().length > 0
      ? mulberry32(hashStringToUint32(seed.trim().toUpperCase()))
      : Math.random;

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateRandomSeed(length = 4): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Bygger en kompakt klassekode ud fra spillets indstillinger, f.eks. "EUZ-5-120-K7M2".
 */
export function encodeClassCode(settings: ClassGameSettings): string {
  const pack = THEME_PACKS.find((p) => p.id === settings.packId) ?? THEME_PACKS[0];
  const cleanSeed = settings.seed
    .toUpperCase()
    .replace(/[^A-Z0-9ÆØÅ]/g, '')
    .slice(0, 8) || generateRandomSeed(4);
  return `${pack.shortCode}-${settings.roundCount}-${settings.timerSeconds}-${cleanSeed}`;
}

/**
 * Fortolker en klassekode indtastet af eleverne eller læst fra URL'en.
 * Understøtter både fuld struktureret kode ("EUZ-5-120-K7M2") og et frit kodeord ("2GA").
 */
export function decodeClassCode(
  rawInput: string,
  fallback: Omit<ClassGameSettings, 'seed'>
): ClassGameSettings | null {
  const trimmed = rawInput.trim().toUpperCase();
  if (!trimmed) return null;

  const parts = trimmed.split('-').filter(Boolean);
  if (parts.length >= 4) {
    const [packShort, roundsStr, timerStr, ...seedParts] = parts;
    const matchedPack = THEME_PACKS.find((p) => p.shortCode === packShort);
    const parsedRounds = Number.parseInt(roundsStr, 10);
    const parsedTimer = Number.parseInt(timerStr, 10);
    const seed = seedParts.join('').replace(/[^A-Z0-9ÆØÅ]/g, '').slice(0, 8);

    if (
      matchedPack &&
      Number.isFinite(parsedRounds) &&
      parsedRounds >= 1 &&
      parsedRounds <= 36 &&
      Number.isFinite(parsedTimer) &&
      parsedTimer >= 0 &&
      parsedTimer <= 600 &&
      seed.length > 0
    ) {
      return {
        packId: matchedPack.id,
        roundCount: parsedRounds,
        timerSeconds: parsedTimer,
        seed,
      };
    }
  }

  // Frit kodeord (bruger aktuelle indstillinger + deterministisk seed)
  return {
    ...fallback,
    seed: trimmed.replace(/[^A-Z0-9ÆØÅ]/g, '').slice(0, 12) || trimmed,
  };
}

export function buildShareableClassUrl(code: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('kode', code);
  return url.toString();
}

export function readClassCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const kode = params.get('kode');
  return kode ? kode.trim() : null;
}
