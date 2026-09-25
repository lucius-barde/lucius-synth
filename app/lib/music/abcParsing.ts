/**
 * Conversion de la notation ABC (sous-ensemble décrit dans abcConversion.ts)
 * vers le modèle musical interne (MusicDocument).
 *
 * Cette fonction est le pendant inverse de musicDocumentToAbc(). Elle ne
 * réalise pas la validation métier complète (plage MIDI, mesure supportée,
 * nombre de pistes, etc.) : voir abcValidation.ts (étape 8) pour cela, qui
 * s'appuie sur cette fonction et sur constraints.ts.
 *
 * Sous-ensemble ABC pris en charge :
 * - Un seul tune (X:1) : seul le premier tune du fichier est utilisé.
 * - En-tête : T: (titre), M: (mesure), L: (unité de note, doit être 1/16
 *   pour une conversion sans perte, mais toute L: est tolérée et convertie),
 *   Q: (tempo, en "Q:1/4=<bpm>" ou toute forme reconnue par abcjs).
 * - Une voix (V:) par piste, dans l'ordre de déclaration.
 * - Notes/silences/barres de mesure standards, altérations dièse/bémol/
 *   naturel/double, octaves via `,` et `'`.
 * - Ligne de métadonnées `%lucius-track muted=<0|1> solo=<0|1> instrument=<id>`
 *   juste après l'en-tête de voix, pour restaurer fidèlement muted/solo/
 *   instrument. Si absente, l'instrument est déduit de `%%MIDI program`
 *   (voir midiProgramToInstrument) et muted/solo valent false.
 *
 * Tout élément ABC non supporté (répétitions, paroles, accords multiples,
 * triplets, grace notes, etc.) est ignoré et signalé via un avertissement
 * plutôt que silencieusement supprimé.
 */
import abcjs from "abcjs";
import type { TuneObject, VoiceItem } from "abcjs";
import { DEFAULT_TEMPO, MAX_TRACKS, isSupportedMeter, type Meter } from "./constants";
import { createNote, generateLocalId, getTrackColor } from "./factory";
import { midiProgramToInstrument } from "./abcConversion";
import type { MusicDocument, MusicTrack } from "./types";

export type AbcParseOutcome = {
  document: MusicDocument | null;
  warnings: string[];
  errors: string[];
};

const ACCIDENTAL_SEMITONES: Record<string, number> = {
  sharp: 1,
  flat: -1,
  natural: 0,
  dblsharp: 2,
  dblflat: -2,
};

const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Convertit le champ `name` d'un AbcElemPitch (ex: "^D", "C,", "_Bb,,",
 * "=C", "c'") combiné à son `accidental` éventuel en numéro MIDI.
 * Retourne `null` si le nom n'est pas reconnu.
 */
export function abcPitchNameToMidi(name: string, accidental?: string): number | null {
  const match = /^([_^=]*)([A-Ga-g])([,']*)$/.exec(name.trim());
  if (!match) return null;
  const [, accidentalMarks, letter, octaveMarks] = match;

  const letterUpper = letter.toUpperCase();
  const baseSemitone = LETTER_SEMITONES[letterUpper];
  if (baseSemitone === undefined) return null;

  // L'altération peut être fournie séparément (accidental) ou encodée dans
  // le nom lui-même (^ = dièse, _ = bémol, = = naturel, doublé = double).
  let accidentalSemitones = 0;
  if (accidental && ACCIDENTAL_SEMITONES[accidental] !== undefined) {
    accidentalSemitones = ACCIDENTAL_SEMITONES[accidental];
  } else if (accidentalMarks) {
    if (accidentalMarks === "^") accidentalSemitones = 1;
    else if (accidentalMarks === "^^") accidentalSemitones = 2;
    else if (accidentalMarks === "_") accidentalSemitones = -1;
    else if (accidentalMarks === "__") accidentalSemitones = -2;
    else if (accidentalMarks === "=") accidentalSemitones = 0;
  }

  // ABC : lettre majuscule = octave 4 (base), minuscule = octave 5.
  // `,` abaisse d'une octave, `'` élève d'une octave, chacun cumulable.
  let octave = letter === letterUpper ? 4 : 5;
  for (const mark of octaveMarks) {
    if (mark === ",") octave -= 1;
    else if (mark === "'") octave += 1;
  }

  const midi = (octave + 1) * 12 + baseSemitone + accidentalSemitones;
  return midi;
}

const STEP_DURATION_IN_WHOLE_NOTES = 0.0625; // 1/16 de ronde = 1 double-croche = 1 step.
/** Tolérance pour la comparaison de flottants (fractions ABC converties en nombres). */
const DURATION_EPSILON = 1e-6;

/**
 * Convertit une durée ABC (fraction de ronde) en nombre de steps (doubles
 * croches). Retourne `null` si la durée n'est pas un multiple entier exact
 * de la double-croche (résolution rythmique non supportée par l'application,
 * ex: triple-croche issue d'un `L:1/32`), plutôt que d'arrondir silencieusement.
 */
function abcDurationToSteps(duration: number): number | null {
  const rawSteps = duration / STEP_DURATION_IN_WHOLE_NOTES;
  const rounded = Math.round(rawSteps);
  if (Math.abs(rawSteps - rounded) > DURATION_EPSILON) {
    return null;
  }
  return rounded;
}

function extractVoiceMeta(abc: string, voiceNumber: number): {
  muted: boolean;
  solo: boolean;
  instrument: string | null;
  midiProgram: number | null;
  name: string | null;
} {
  const lines = abc.split(/\r?\n/);
  const voiceHeaderRegex = new RegExp(`^V:\\s*${voiceNumber}\\b`);
  const headerIndex = lines.findIndex((line) => voiceHeaderRegex.test(line.trim()));
  if (headerIndex === -1) {
    return { muted: false, solo: false, instrument: null, midiProgram: null, name: null };
  }

  const headerLine = lines[headerIndex];
  const nameMatch = /name="([^"]*)"/.exec(headerLine);
  const programMatch = /%%MIDI\s+program\s+(\d+)/.exec(headerLine);

  // La ligne de métadonnées custom suit immédiatement l'en-tête de voix.
  const metaLine = lines[headerIndex + 1] ?? "";
  const metaMatch = /^%lucius-track\s+muted=([01])\s+solo=([01])\s+instrument=(\S+)/.exec(metaLine.trim());

  return {
    muted: metaMatch ? metaMatch[1] === "1" : false,
    solo: metaMatch ? metaMatch[2] === "1" : false,
    instrument: metaMatch ? metaMatch[3] : null,
    midiProgram: programMatch ? Number(programMatch[1]) : null,
    name: nameMatch ? nameMatch[1] : null,
  };
}

/**
 * Regroupe, pour chaque voix (par ordre de déclaration V:1, V:2, ...), la
 * liste des VoiceItem "note" (notes/silences) rencontrés dans l'ensemble des
 * lignes du tune. abcjs place chaque voix dans son propre `staff[].voices[0]`
 * lorsque les voix ne sont pas regroupées explicitement sur une portée
 * commune (%%staves), ce qui correspond à la structure générée par
 * musicDocumentToAbc().
 */
function collectVoiceItemsInOrder(tune: TuneObject): VoiceItem[][] {
  // Pour la structure générée par musicDocumentToAbc(), chaque piste possède
  // son propre staff avec une seule voix (pas de regroupement %%staves).
  // Le N-ième staff rencontré (dans l'ordre des lignes) correspond donc à la
  // N-ième piste (V:1, V:2, ...). On accumule les VoiceItem de chaque staff
  // au fil des lignes, en supposant que le nombre et l'ordre des staffs sont
  // stables d'une ligne de portée à l'autre.
  const voices: VoiceItem[][] = [];
  for (const line of tune.lines) {
    if (!line.staff) continue;
    line.staff.forEach((staff, staffIndex) => {
      const voiceItems = staff.voices?.[0];
      if (!voiceItems) return;
      if (!voices[staffIndex]) voices[staffIndex] = [];
      voices[staffIndex].push(...voiceItems);
    });
  }
  return voices;
}

/**
 * Convertit une notation ABC (sous-ensemble supporté) en MusicDocument.
 *
 * Ne lève pas d'exception : retourne `document: null` avec `errors` non vide
 * en cas d'échec de parsing ou de structure non supportée. Les éléments ABC
 * reconnus mais non pris en charge par cette application sont signalés dans
 * `warnings` sans faire échouer la conversion.
 */
export function abcToMusicDocument(abc: string): AbcParseOutcome {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!abc || !abc.trim()) {
    return { document: null, warnings, errors: ["Le contenu ABC est vide."] };
  }

  let tunes: TuneObject[];
  try {
    tunes = abcjs.parseOnly(abc) as unknown as TuneObject[];
  } catch (err) {
    return {
      document: null,
      warnings,
      errors: [`Erreur de syntaxe ABC : ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  if (!tunes || tunes.length === 0 || !tunes[0]) {
    return { document: null, warnings, errors: ["Le contenu ABC n'a pas pu être interprété (aucun tune trouvé)."] };
  }

  const tune = tunes[0];

  if (Array.isArray(tune.warnings) && tune.warnings.length > 0) {
    for (const w of tune.warnings) warnings.push(`Avertissement abcjs : ${w}`);
  }

  const title = tune.metaText?.title?.trim();
  if (!title) {
    errors.push("Champ obligatoire manquant : le titre (T:) est absent.");
  }

  let meter: Meter | null = null;
  try {
    const meterFraction = tune.getMeterFraction();
    const meterStr = `${meterFraction.num}/${meterFraction.den ?? 4}`;
    if (isSupportedMeter(meterStr)) {
      meter = meterStr;
    } else {
      errors.push(`Mesure non supportée : "${meterStr}". Mesures acceptées : 2/4, 3/4, 4/4, 6/8, 9/8.`);
    }
  } catch {
    errors.push("Impossible de déterminer la mesure (champ M:) du morceau.");
  }

  let tempo = DEFAULT_TEMPO;
  try {
    // On lit directement metaText.tempo.bpm (valeur brute telle qu'écrite
    // dans le champ Q:) plutôt que tune.getBpm(), qui recalcule un "tempo
    // effectif" en fonction de l'unité de battement par défaut de la mesure
    // (ex: croche pointée en 6/8) : notre convention Q:1/4=<tempo> signifie
    // toujours "la noire vaut <tempo>", et doit être relue telle quelle.
    const bpm = tune.metaText?.tempo?.bpm;
    if (typeof bpm === "number" && Number.isFinite(bpm) && bpm > 0) {
      tempo = Math.round(bpm);
    } else {
      warnings.push("Tempo non exploitable dans l'ABC ; valeur par défaut appliquée.");
    }
  } catch {
    warnings.push("Champ tempo (Q:) absent ou non exploitable ; valeur par défaut appliquée.");
  }

  const voiceItemGroups = collectVoiceItemsInOrder(tune);

  if (voiceItemGroups.length === 0) {
    errors.push("Aucune piste (voix ABC) trouvée dans le morceau.");
  }
  if (voiceItemGroups.length > MAX_TRACKS) {
    errors.push(`Le morceau contient ${voiceItemGroups.length} pistes, alors que ${MAX_TRACKS} au maximum sont supportées.`);
  }

  if (errors.length > 0) {
    return { document: null, warnings, errors };
  }

  const tracks: MusicTrack[] = [];
  const trackVoiceGroups = voiceItemGroups.slice(0, MAX_TRACKS);

  for (let trackIndex = 0; trackIndex < trackVoiceGroups.length; trackIndex++) {
    const items = trackVoiceGroups[trackIndex];
    const voiceNumber = trackIndex + 1;
    const meta = extractVoiceMeta(abc, voiceNumber);
    const instrument =
      (meta.instrument && isKnownInstrument(meta.instrument) ? meta.instrument : null) ??
      (meta.midiProgram !== null ? midiProgramToInstrument(meta.midiProgram) : "piano");

    const track: MusicTrack = {
      id: generateLocalId("track"),
      name: meta.name ?? `Piste ${voiceNumber}`,
      instrument,
      notes: [],
      muted: meta.muted,
      solo: meta.solo,
    };

    let cursorStep = 0;
    // Suivi de la dernière note créée si elle attend la suite d'une liaison
    // (startTie), afin de fusionner les notes ABC liées (`-`) générées par
    // musicDocumentToAbc() pour représenter une durée non "ronde" (ex: 11
    // steps -> 8-2-1 liés) en une seule note interne.
    let pendingTiedNote: { midi: number } | null = null;

    for (const item of items) {
      if (item.el_type !== "note") {
        // abcjs expose les directives %%MIDI comme des éléments "midi" dans
        // les voix. Elles décrivent l'instrument, déjà récupéré dans l'en-tête,
        // et ne doivent pas être traitées comme des éléments musicaux.
        if (item.el_type === "bar" || item.el_type === "midi") continue;
        warnings.push(`Piste ${voiceNumber} : élément ABC "${item.el_type}" non pris en charge, ignoré.`);
        continue;
      }

      const durationSteps = abcDurationToSteps(item.duration);
      if (durationSteps === null) {
        errors.push(
          `Piste ${voiceNumber} : durée non supportée (résolution plus fine que la double-croche détectée).`
        );
        continue;
      }
      if (durationSteps <= 0) {
        warnings.push(`Piste ${voiceNumber} : durée nulle, ignorée.`);
        continue;
      }

      if (item.rest) {
        // Silence : fait avancer le curseur mais ne crée pas de note.
        pendingTiedNote = null;
        cursorStep += durationSteps;
        continue;
      }

      const pitches = item.pitches ?? [];
      if (pitches.length === 0) {
        pendingTiedNote = null;
        cursorStep += durationSteps;
        continue;
      }
      if (pitches.length > 1) {
        warnings.push(
          `Piste ${voiceNumber} : accord (plusieurs hauteurs simultanées) détecté, seule la première hauteur est conservée.`
        );
      }

      const pitchInfo = pitches[0];
      const midi = abcPitchNameToMidi(pitchInfo.name, pitchInfo.accidental);
      if (midi === null) {
        warnings.push(`Piste ${voiceNumber} : hauteur ABC "${pitchInfo.name}" non reconnue, ignorée.`);
        pendingTiedNote = null;
        cursorStep += durationSteps;
        continue;
      }

      const continuesTie = pendingTiedNote !== null && pendingTiedNote.midi === midi;
      if (continuesTie) {
        // Prolonge la dernière note créée au lieu d'en ajouter une nouvelle.
        const lastNote = track.notes[track.notes.length - 1];
        lastNote.durationSteps += durationSteps;
      } else {
        track.notes.push(
          createNote({
            midi,
            startStep: cursorStep,
            durationSteps,
          })
        );
      }

      pendingTiedNote = pitchInfo.startTie ? { midi } : null;
      cursorStep += durationSteps;
    }

    tracks.push(track);
  }

  if (errors.length > 0) {
    return { document: null, warnings, errors };
  }

  const document: MusicDocument = {
    title: title ?? "Sans titre",
    tempo,
    meter: meter ?? "4/4",
    tracks,
    abcNotation: abc,
  };

  return { document, warnings, errors: [] };
}

function isKnownInstrument(value: string): value is MusicTrack["instrument"] {
  return value === "piano" || value === "bass" || value === "guitar" || value === "flute" || value === "violin" || value === "harp" || value === "percussion";
}

/** Ré-exporté pour l'affichage des couleurs de piste après un chargement ABC. */
export { getTrackColor };
