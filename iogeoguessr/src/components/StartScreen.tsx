import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Globe2,
  Hash,
  Link2,
  Loader2,
  LogIn,
  MapPin,
  Play,
  Presentation,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { GameLocation, THEME_PACKS, ThemePackId } from '../config/locations';
import { getCountryNameDa, OECD_SOURCE_CITATION } from '../data/oecdTranslations';
import { formatPoints } from '../utils/geo';
import {
  buildShareableClassUrl,
  decodeClassCode,
  encodeClassCode,
  generateRandomSeed,
} from '../utils/gameCode';
import { ANALYSIS_MAX_POINTS } from '../utils/bonusQuestion';

interface StartScreenProps {
  locations: GameLocation[];
  disabledLocationIds: string[];
  onToggleLocationEnabled: (id: string) => void;
  packId: ThemePackId;
  onChangePackId: (packId: ThemePackId) => void;
  roundCount: number;
  onChangeRoundCount: (count: number) => void;
  timerSeconds: number;
  onChangeTimerSeconds: (seconds: number) => void;
  activeClassCode: string;
  onApplyClassCode: (code: string) => void;
  onClearClassCode: () => void;
  onStartGame: () => void;
  onCreateRoom: () => Promise<void>;
  onJoinRoom: (roomCode: string, playerName: string) => Promise<void>;
  initialRoomCode?: string | null;
  roomActionBusy?: boolean;
  roomActionError?: string | null;
  onUpdateLocationUrl: (id: string, newUrl: string) => void;
  onResetLocations: () => void;
}

const ROUND_OPTIONS = [3, 5, 8, 10];
const TIMER_OPTIONS = [
  { seconds: 0, label: 'Ingen' },
  { seconds: 90, label: '1:30' },
  { seconds: 120, label: '2:00' },
  { seconds: 180, label: '3:00' },
];

export function StartScreen({
  locations,
  disabledLocationIds,
  onToggleLocationEnabled,
  packId,
  onChangePackId,
  roundCount,
  onChangeRoundCount,
  timerSeconds,
  onChangeTimerSeconds,
  activeClassCode,
  onApplyClassCode,
  onClearClassCode,
  onStartGame,
  onCreateRoom,
  onJoinRoom,
  initialRoomCode = null,
  roomActionBusy = false,
  roomActionError = null,
  onUpdateLocationUrl,
  onResetLocations,
}: StartScreenProps) {
  const [panelTab, setPanelTab] = useState<'host' | 'join' | 'solo'>(
    initialRoomCode ? 'join' : 'host'
  );
  const [joinCodeInput, setJoinCodeInput] = useState(initialRoomCode ?? '');
  const [joinNameInput, setJoinNameInput] = useState('');

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState('');

  const [codeInput, setCodeInput] = useState(activeClassCode);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    if (initialRoomCode) {
      setJoinCodeInput(initialRoomCode);
      setPanelTab('join');
    }
  }, [initialRoomCode]);

  useEffect(() => {
    setCodeInput(activeClassCode);
  }, [activeClassCode]);

  const disabledSet = useMemo(() => new Set(disabledLocationIds), [disabledLocationIds]);

  const activeLocations = useMemo(
    () => locations.filter((loc) => !disabledSet.has(loc.id)),
    [locations, disabledSet]
  );

  const selectedPack = useMemo(
    () => THEME_PACKS.find((p) => p.id === packId) ?? THEME_PACKS[0],
    [packId]
  );

  const packLocations = useMemo(
    () => activeLocations.filter(selectedPack.filter),
    [activeLocations, selectedPack]
  );

  const maxRounds = Math.max(1, packLocations.length);
  const effectiveRounds = Math.min(roundCount, maxRounds);
  const maxGeoScore = effectiveRounds * 5000;
  const maxAnalysisScore = effectiveRounds * ANALYSIS_MAX_POINTS;

  const filteredTeacherLocations = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((loc) => {
      const name = getCountryNameDa(loc.countryCode).toLowerCase();
      return (
        name.includes(q) ||
        loc.countryCode.toLowerCase().includes(q) ||
        loc.areaLabel.toLowerCase().includes(q)
      );
    });
  }, [locations, teacherSearch]);

  const handleGenerateCode = () => {
    const generated = encodeClassCode({
      packId,
      roundCount: effectiveRounds,
      timerSeconds,
      seed: generateRandomSeed(4),
    });
    setCodeInput(generated);
    onApplyClassCode(generated);
    setCodeMessage('Klassekode oprettet – del koden eller linket med klassen.');
  };

  const handleApplyInput = () => {
    const trimmed = codeInput.trim();
    if (!trimmed) {
      onClearClassCode();
      setCodeMessage('Klassekode fjernet – spillet bruger nu tilfældig udtrækning.');
      return;
    }
    const parsed = decodeClassCode(trimmed, {
      packId,
      roundCount: effectiveRounds,
      timerSeconds,
    });
    if (!parsed) {
      setCodeMessage('Kunne ikke aflæse koden. Prøv f.eks. EUZ-5-120-K7M2 eller 2GA.');
      return;
    }
    const normalized = encodeClassCode(parsed);
    setCodeInput(normalized);
    onApplyClassCode(normalized);
    setCodeMessage(`Klassekode aktiveret: ${normalized}`);
  };

  const handleCopy = async (type: 'code' | 'link') => {
    const targetCode =
      activeClassCode ||
      encodeClassCode({
        packId,
        roundCount: effectiveRounds,
        timerSeconds,
        seed: generateRandomSeed(4),
      });

    if (!activeClassCode) {
      setCodeInput(targetCode);
      onApplyClassCode(targetCode);
    }

    const textToCopy =
      type === 'link' ? buildShareableClassUrl(targetCode) : targetCode;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedType(type);
      window.setTimeout(() => setCopiedType(null), 2000);
    } catch {
      setCodeMessage(
        type === 'link'
          ? `Kopiér linket manuelt: ${textToCopy}`
          : `Kopiér koden manuelt: ${targetCode}`
      );
    }
  };

  const startEditing = (loc: GameLocation) => {
    setEditingId(loc.id);
    setDraftUrl(loc.streetViewEmbedUrl);
  };

  const saveEdit = (id: string) => {
    const trimmed = draftUrl.trim();
    if (trimmed) {
      const iframeSrcMatch = trimmed.match(/src=["']([^"']+)["']/i);
      const cleanUrl = iframeSrcMatch ? iframeSrcMatch[1] : trimmed;
      onUpdateLocationUrl(id, cleanUrl);
    }
    setEditingId(null);
    setDraftUrl('');
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#090D16] text-slate-100">
      {/* Diskret geografisk baggrundsgitter */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-emerald-500/10 via-sky-500/5 to-transparent"
      />

      {/* Topbar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">
              OECD GeoGuessr
            </p>
            <p className="text-xs text-slate-400">
              International Økonomi · 2.g A-niveau · {activeLocations.length} aktive OECD-lande
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowTeacherModal(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#101829] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
        >
          <Settings2 className="h-3.5 w-3.5 text-slate-400" />
          <span>
            Lærer: Lokationer ({activeLocations.length}/{locations.length})
          </span>
        </button>
      </header>

      {/* Hovedindhold */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-start gap-7 px-6 py-4 lg:grid-cols-12">
        {/* Venstre: Intro, regler & temapakker */}
        <div className="space-y-6 lg:col-span-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
              Visuel lokationsgætning · Makroøkonomisk dataanalyse
            </p>
            <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              OECD GeoGuessr –{' '}
              <span className="text-emerald-400">Priskonkurrenceevne</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
              Afkod først sammenhængen i landets faktiske OECD-kurver for produktivitet,
              lønomkostninger og priskonkurrence for at låse Street View op – og sæt derefter
              nålen på verdenskortet.
            </p>
          </div>

          {/* Temapakke-vælger */}
          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Vælg temapakke
              </h2>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                {packLocations.length} aktive lande i pakken
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {THEME_PACKS.map((pack) => {
                const active = pack.id === packId;
                const countInPack = activeLocations.filter(pack.filter).length;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    disabled={countInPack === 0}
                    onClick={() => onChangePackId(pack.id)}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      active
                        ? 'border-emerald-400/80 bg-emerald-500/12 shadow-sm'
                        : countInPack === 0
                          ? 'cursor-not-allowed border-slate-800/60 bg-[#0B1120] opacity-45'
                          : 'border-slate-800/90 bg-[#101829]/85 hover:border-slate-700 hover:bg-[#131D32]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-bold ${
                          active ? 'text-emerald-200' : 'text-white'
                        }`}
                      >
                        {pack.nameDa}
                      </span>
                      <span className="font-mono text-[10.5px] font-semibold text-slate-400 tabular-nums">
                        {countInPack} · {pack.shortCode}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">
                      {pack.descriptionDa}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3 hurtige spilleregler */}
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800/80 bg-[#0D1424]/80 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-400">
                <span className="font-mono tabular-nums">01</span>
                <BarChart3 className="h-3.5 w-3.5" />
              </div>
              <p className="mt-2 text-xs font-bold text-white">Afkod sammenhængen</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                Læs graferne og find den rigtige økonomiske sammenhæng (+1.500 pt) for at
                låse Street View op.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-[#0D1424]/80 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                <span className="font-mono tabular-nums">02</span>
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <p className="mt-2 text-xs font-bold text-white">Street View + kort</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                Brug Street View og valgfrie makro-hints (-250 pt) til at ramme landet på
                kortet (op til 5.000 pt).
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-[#0D1424]/80 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span className="font-mono tabular-nums">03</span>
                <Globe2 className="h-3.5 w-3.5" />
              </div>
              <p className="mt-2 text-xs font-bold text-white">Sammenlign med DK</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                Læg Danmarks kurver oven på resultatet og drøft refleksionsspørgsmålet i par.
              </p>
            </div>
          </div>
        </div>

        {/* Højre: Lærerrum / Deltag i rum / Spil alene */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-800 bg-[#101829]/95 p-5 shadow-2xl sm:p-6">
            {/* Tilstandsfaner */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-800 bg-[#090D16] p-1">
              <button
                type="button"
                onClick={() => setPanelTab('host')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  panelTab === 'host'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Presentation className="h-3.5 w-3.5" />
                <span>Lærerrum</span>
              </button>
              <button
                type="button"
                onClick={() => setPanelTab('join')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  panelTab === 'join'
                    ? 'bg-amber-400/15 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Deltag (Elev)</span>
              </button>
              <button
                type="button"
                onClick={() => setPanelTab('solo')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  panelTab === 'solo'
                    ? 'bg-sky-500/15 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Spil alene</span>
              </button>
            </div>

            {panelTab === 'join' ? (
              /* ELEV: DELTAG I LÆRERRUM */
              <form
                className="mt-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!roomActionBusy) {
                    void onJoinRoom(joinCodeInput, joinNameInput);
                  }
                }}
              >
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Deltag i klasserum
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Indtast rumkoden fra tavlen og dit navn eller makkerpar. Intet login påkrævet.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Rumkode (4 tegn)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={joinCodeInput}
                    onChange={(e) =>
                      setJoinCodeInput(
                        e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '')
                      )
                    }
                    placeholder="F.eks. K7M2"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-[#090D16] px-4 py-3 text-center font-mono text-2xl font-extrabold tracking-[0.28em] text-amber-300 placeholder:tracking-normal placeholder:text-base placeholder:font-normal placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Navn eller makkerpar
                  </label>
                  <input
                    type="text"
                    maxLength={28}
                    value={joinNameInput}
                    onChange={(e) => setJoinNameInput(e.target.value)}
                    placeholder="F.eks. Emma & Noah"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-[#090D16] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {roomActionError && (
                  <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {roomActionError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    roomActionBusy ||
                    joinCodeInput.trim().length !== 4 ||
                    joinNameInput.trim().length < 1
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {roomActionBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  <span>{roomActionBusy ? 'Tilslutter…' : 'Deltag i rum'}</span>
                </button>
              </form>
            ) : (
              /* LÆRERRUM (VÆRT) ELLER SPIL ALENE */
              <>
                <div className="mt-4">
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    {panelTab === 'host'
                      ? 'Opret lærerstyret klasserum'
                      : 'Spilopsætning (solo / øvelse)'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {panelTab === 'host'
                      ? 'Du styrer rundeskift på storskærmen, ser live fremdrift, klassekort og live scoreboard.'
                      : 'Spil i dit eget tempo – ideelt til træning eller lektier.'}
                  </p>
                </div>

                {/* Antal runder */}
                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Antal runder
                  </label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {ROUND_OPTIONS.filter((n) => n <= maxRounds).map((count) => {
                      const active = effectiveRounds === count;
                      return (
                        <button
                          key={count}
                          type="button"
                          onClick={() => onChangeRoundCount(count)}
                          className={`rounded-xl border py-2 font-mono text-sm font-bold tabular-nums transition ${
                            active
                              ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                              : 'border-slate-800 bg-[#0B1120] text-slate-300 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {count}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Valgfri timer */}
                <div className="mt-4">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Tidsgrænse pr. runde (valgfri)</span>
                  </label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {TIMER_OPTIONS.map((opt) => {
                      const active = timerSeconds === opt.seconds;
                      return (
                        <button
                          key={opt.seconds}
                          type="button"
                          onClick={() => onChangeTimerSeconds(opt.seconds)}
                          className={`rounded-xl border py-2 font-mono text-xs font-semibold tabular-nums transition ${
                            active
                              ? 'border-sky-400 bg-sky-500/15 text-sky-200'
                              : 'border-slate-800 bg-[#0B1120] text-slate-300 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fælles klassekode kun i solo-fanen */}
                {panelTab === 'solo' && (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-[#0B1120] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Hash className="h-3.5 w-3.5 text-amber-400" />
                        Fast spilkode (valgfri)
                      </span>
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Opret kode</span>
                      </button>
                    </div>

                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleApplyInput();
                        }}
                        placeholder="F.eks. EUZ-5-120-K7M2"
                        className="min-w-0 flex-1 rounded-lg border border-slate-700/90 bg-[#090D16] px-3 py-1.5 font-mono text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyInput}
                        className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-700"
                      >
                        Anvend
                      </button>
                    </div>

                    {activeClassCode && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
                        <span className="font-mono text-[11px] font-semibold text-amber-300">
                          Aktiv: {activeClassCode}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy('code')}
                            className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-600 hover:text-white"
                          >
                            {copiedType === 'code' ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span>{copiedType === 'code' ? 'Kopieret' : 'Kode'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy('link')}
                            className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20"
                          >
                            {copiedType === 'link' ? (
                              <Check className="h-3 w-3 text-emerald-300" />
                            ) : (
                              <Link2 className="h-3 w-3" />
                            )}
                            <span>{copiedType === 'link' ? 'Link kopieret' : 'Kopiér link'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCodeInput('');
                              onClearClassCode();
                              setCodeMessage(null);
                            }}
                            title="Nulstil spilkode"
                            className="text-slate-500 hover:text-slate-300"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {codeMessage && (
                      <p className="mt-1.5 text-[11px] text-slate-400">{codeMessage}</p>
                    )}
                  </div>
                )}

                {/* Spiloversigt */}
                <div className="mt-4 space-y-1.5 rounded-xl border border-slate-800/80 bg-[#0B1120] p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Valgt pakke</span>
                    <span className="font-semibold text-white">{selectedPack.nameDa}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Maks. point</span>
                    <span className="font-mono font-semibold text-white tabular-nums">
                      {formatPoints(maxGeoScore)} kort + {formatPoints(maxAnalysisScore)} IØ
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Styring</span>
                    <span className="text-slate-200">
                      {panelTab === 'host'
                        ? 'Lærerstyrede runder + live scoreboard'
                        : activeClassCode
                          ? `Låst til kode (${activeClassCode})`
                          : 'Tilfældig uden gentagelser'}
                    </span>
                  </div>
                </div>

                {panelTab === 'host' && roomActionError && (
                  <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {roomActionError}
                  </p>
                )}

                {panelTab === 'host' ? (
                  <button
                    type="button"
                    disabled={packLocations.length === 0 || roomActionBusy}
                    onClick={() => void onCreateRoom()}
                    className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {roomActionBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Presentation className="h-4 w-4" />
                    )}
                    <span>
                      {roomActionBusy
                        ? 'Opretter lærerrum…'
                        : `Opret lærerrum (${effectiveRounds} runder)`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={packLocations.length === 0}
                    onClick={onStartGame}
                    className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Start solospil ({effectiveRounds} runder)</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-[11px] text-slate-500">
        <span>Datakilde: {OECD_SOURCE_CITATION} (36 komplette OECD-lande)</span>
        <span>Kortdata: OpenStreetMap via Leaflet · Street View: Google Maps embed</span>
      </footer>

      {/* Lærer-modal med live Street View-tjekker + Aktiv/Fra-knap pr. land */}
      {showTeacherModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Lærerkonfiguration af lokationer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0D1424] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Læreroversigt: Test Street View & administrér lokationer ({activeLocations.length}/
                  {locations.length} aktive)
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Klik på <strong>Test Street View</strong> for at tjekke om et land viser billede,
                  slå evt. lokationer fra, eller indsæt et nyt Google Maps &quot;Indlejr et kort&quot;-link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-800 px-5 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Søg efter land, landekode eller område…"
                  className="w-full rounded-lg border border-slate-800 bg-[#090D16] py-1.5 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="custom-scrollbar flex-1 divide-y divide-slate-800/80 overflow-y-auto px-5 py-2">
              {filteredTeacherLocations.map((loc) => {
                const isEditing = editingId === loc.id;
                const isPreviewing = previewId === loc.id;
                const isDisabled = disabledSet.has(loc.id);

                return (
                  <div
                    key={loc.id}
                    className={`py-3 transition ${isDisabled ? 'opacity-55' : ''}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-white">
                          {getCountryNameDa(loc.countryCode)}
                        </span>
                        <span className="ml-2 font-mono text-xs text-emerald-400">
                          {loc.countryCode}
                        </span>
                        <span className="mx-2 text-slate-600">·</span>
                        <span className="text-xs text-slate-400">{loc.areaLabel}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewId((prev) => (prev === loc.id ? null : loc.id))
                          }
                          className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
                            isPreviewing
                              ? 'border-sky-400 bg-sky-500/15 text-sky-200'
                              : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:border-slate-600 hover:text-white'
                          }`}
                        >
                          {isPreviewing ? (
                            <>
                              <EyeOff className="h-3 w-3" />
                              <span>Skjul test</span>
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3" />
                              <span>Test Street View</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleLocationEnabled(loc.id)}
                          className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                            isDisabled
                              ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                          }`}
                        >
                          {isDisabled ? 'Slået fra' : 'Aktiv i spil'}
                        </button>
                      </div>
                    </div>

                    {isPreviewing && (
                      <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-700 bg-[#060911]">
                        <iframe
                          key={loc.id + loc.streetViewEmbedUrl}
                          src={loc.streetViewEmbedUrl}
                          title={`Forhåndsvisning af Street View for ${getCountryNameDa(loc.countryCode)}`}
                          className="h-[220px] w-full border-0"
                          loading="eager"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    )}

                    {isEditing ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={draftUrl}
                          onChange={(e) => setDraftUrl(e.target.value)}
                          placeholder='Indsæt URL eller hel <iframe src="..."> kode fra Google Maps'
                          className="flex-1 rounded-lg border border-slate-700 bg-[#090D16] px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(loc.id)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Gem
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                        >
                          Annuller
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex items-center justify-between gap-3">
                        <p className="truncate font-mono text-[11px] text-slate-500">
                          {loc.streetViewEmbedUrl}
                        </p>
                        <button
                          type="button"
                          onClick={() => startEditing(loc)}
                          className="shrink-0 text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          Skift iframe-URL
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3.5">
              <button
                type="button"
                onClick={() => {
                  onResetLocations();
                  setPreviewId(null);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Nulstil alle lokationer
              </button>
              <button
                type="button"
                onClick={() => setShowTeacherModal(false)}
                className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-white"
              >
                Luk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
