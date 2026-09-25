/**
 * Conversion entre le modèle musical interne (MusicDocument) et la notation
 * ABC utilisée pour la persistance (voir aussi abcParsing.ts pour la
 * conversion inverse, et abcValidation.ts pour la validation).
 *
 * ────────────────────────────────────────────────────────────────────────
 * STRUCTURE ABC RETENUE (à respecter par tout code qui génère ou parse
 * l'ABC de cette application) :
 * ────────────────────────────────────────────────────────────────────────
 *
 * - Un seul "tune" ABC (X:1) par MusicDocument.
 * - Une voix ABC (`V:`) par piste, dans l'ordre des pistes (V:1 → piste 0,
 *   V:2 → piste 1, etc.). Au maximum MAX_TRACKS voix.
 * - En-tête du tune :
 *     X:1
 *     T:<titre>              (le titre de la composition)
 *     M:<mesure>              (2/4, 3/4, 4/4, 6/8 ou 9/8)
 *     L:1/16                  (unité de note par défaut = 1 double-croche = 1 "step" interne)
 *     Q:1/4=<tempo>            (tempo en noires par minute)
 *     K:C                      (clé fixe : do majeur, sans altération à la clé ;
 *                               toutes les altérations sont donc explicites sur
 *                               chaque note, ce qui évite toute ambiguïté lors
 *                               du parsing retour)
 *     V:1 name="<nom piste>" %%MIDI program <n° instrument General MIDI>
 *     V:2 ...
 *     V:3 ...
 *     V:4 ...
 * - Chaque voix commence par une ligne `V:<n> name="..." ...` suivie de la
 *   portée de notes de la piste correspondante, terminée par `|]`.
 * - Métadonnées de piste conservées via des commentaires structurés en fin de
 *   ligne de voix (non interprétés par abcjs, mais relus par notre parseur) :
 *     V:1 name="Piste 1" %%MIDI program 0
 *     %lucius-track muted=0 solo=0 instrument=piano
 *   Cette ligne commence par un simple `%` (commentaire ABC standard, à
 *   distinguer d'une "directive" `%%` qu'abcjs tenterait d'interpréter et
 *   signalerait comme inconnue). Elle est donc ignorée silencieusement par
 *   tout lecteur ABC, y compris abcjs, mais permet à notre propre parseur de
 *   restaurer fidèlement muted/solo/instrument lors du rechargement
 *   (voir abcToMusicDocument).
 * - Durées : `L:1/16` = 1 step. Une note de `durationSteps` steps s'écrit
 *   `<hauteur><durationSteps>` (le suffixe numérique est omis si égal à 1).
 * - Silences : `z<durationSteps>` (silence standard ABC).
 * - Les "trous" entre notes explicites (aucune note ni silence défini sur un
 *   intervalle de steps) sont comblés par des silences générés automatiquement,
 *   afin que la durée totale de chaque mesure soit toujours exacte.
 * - Barres de mesure `|` insérées automatiquement toutes les
 *   STEPS_PER_MEASURE[meter] steps. Une double barre finale `|]` clôt chaque voix.
 * - Altérations : dièse uniquement (convention de l'application). Une note
 *   altérée s'écrit avec un `^` (dièse) devant la lettre ABC (ex: `^C` pour C#).
 * - Octaves : notation ABC standard avec apostrophes/virgules :
 *     C  = C4 (octave "de référence" ABC, correspond à MIDI 60)
 *     C, = C3 (MIDI 48)
 *     c  = C5 (MIDI 72)
 *   Pour la plage de l'application (MIDI 40-79, soit E2-G5), la conversion
 *   utilise les marqueurs d'octave ABC nécessaires.
 */
import {
  AVAILABLE_INSTRUMENTS,
  MAX_TRACKS,
  getStepsPerMeasure,
  type InstrumentId,
  type Meter,
} from "./constants";
import type { MusicDocument, MusicNote, MusicTrack } from "./types";

/** Association instrument interne -> numéro de programme General MIDI (0-127). */
const INSTRUMENT_TO_MIDI_PROGRAM: Record<InstrumentId, number> = {
  piano: 0, // Acoustic Grand Piano
  bass: 32, // Acoustic Bass
  guitar: 25, // Acoustic Guitar (steel)
  flute: 79, // Ocarina
  violin: 41, // Viola
  harp: 46, // Orchestral Harp
  percussion: 117, // Melodic Tom
};

const MIDI_PROGRAM_TO_INSTRUMENT: Record<number, InstrumentId> = Object.fromEntries(
  Object.entries(INSTRUMENT_TO_MIDI_PROGRAM).map(([inst, program]) => [program, inst as InstrumentId])
);

export function instrumentToMidiProgram(instrument: InstrumentId): number {
  return INSTRUMENT_TO_MIDI_PROGRAM[instrument] ?? 0;
}

export function midiProgramToInstrument(program: number): InstrumentId {
  return MIDI_PROGRAM_TO_INSTRUMENT[program] ?? "piano";
}

const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
/** Demi-tons depuis C pour chaque lettre naturelle. */
const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Convertit un numéro MIDI en écriture de hauteur ABC (lettre + altération +
 * marqueurs d'octave), en utilisant uniquement des dièses (convention de
 * l'application) et la clé K:C (donc altérations toujours explicites).
 *
 * Référence : MIDI 60 (C4) = "C" en notation ABC de base.
 */
export function midiToAbcPitch(midi: number): string {
  const semitoneInOctave = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1; // octave scientifique (C4 = octave 4)

  // Trouve la lettre naturelle correspondante et si une altération dièse est nécessaire.
  let letterIndex = NOTE_LETTERS.findIndex((l) => LETTER_SEMITONES[l] === semitoneInOctave);
  let accidental = "";
  if (letterIndex === -1) {
    // Note altérée : on prend la lettre naturelle immédiatement inférieure + dièse.
    letterIndex = NOTE_LETTERS.findIndex((l) => LETTER_SEMITONES[l] === semitoneInOctave - 1);
    accidental = "^";
  }
  const letter = NOTE_LETTERS[letterIndex];

  // ABC : "C" = octave 4. Octave 5 -> minuscule. Octave 3 -> majuscule + virgule.
  let abcLetter: string;
  let octaveMarks = "";
  if (octave >= 5) {
    abcLetter = letter.toLowerCase();
    octaveMarks = "'".repeat(octave - 5);
  } else {
    abcLetter = letter;
    octaveMarks = ",".repeat(4 - octave);
  }

  return `${accidental}${abcLetter}${octaveMarks}`;
}

/**
 * Décompose une durée (en steps) en une somme de puissances de 2, qui sont
 * les seules durées "simples" représentables sans ambiguïté par un unique
 * symbole ABC numérique (ex: 1, 2, 4, 8, 16...). Une durée comme 11 (non
 * représentable par un seul symbole, cf. avertissement abcjs "Duration not
 * representable") est ainsi décomposée en [8, 2, 1].
 */
function decomposeDurationIntoPowersOfTwo(durationSteps: number): number[] {
  const parts: number[] = [];
  let remaining = durationSteps;
  let power = 1;
  // Trouve la plus grande puissance de 2 <= remaining, puis descend.
  while (power * 2 <= remaining) power *= 2;
  while (remaining > 0) {
    while (power > remaining) power /= 2;
    parts.push(power);
    remaining -= power;
  }
  return parts;
}

function noteOrRestToAbc(note: MusicNote | null, durationSteps: number): string {
  const parts = decomposeDurationIntoPowersOfTwo(durationSteps);
  const isRest = !note || note.isRest;

  if (isRest) {
    // Plusieurs silences successifs : aucune perte d'information, juste plus
    // de symboles ABC.
    return parts.map((p) => `z${p === 1 ? "" : p}`).join(" ");
  }

  // Note tenue : on relie les symboles successifs par une liaison `-` pour
  // qu'ils soient joués/affichés comme une seule note tenue, tout en restant
  // dans le sous-ensemble de durées "simples".
  const pitch = midiToAbcPitch(note.midi);
  return parts.map((p) => `${pitch}${p === 1 ? "" : p}`).join("-");
}

/**
 * Construit la portée ABC (suite de notes/silences/barres de mesure) d'une
 * piste, en comblant les intervalles vides par des silences afin que la
 * durée totale de chaque mesure soit toujours exacte.
 */
export function trackToAbcBody(track: MusicTrack, meter: Meter, measureCount: number): string {
  const stepsPerMeasure = getStepsPerMeasure(meter);
  const totalSteps = stepsPerMeasure * measureCount;

  // Trie les notes par position et ignore tout chevauchement résiduel
  // (ne devrait pas arriver grâce aux garde-fous de l'éditeur, mais on reste
  // défensif lors de la génération).
  const sortedNotes = [...track.notes].sort((a, b) => a.startStep - b.startStep);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const note of sortedNotes) {
    if (note.startStep < cursor) continue; // chevauchement défensif : on ignore la note
    if (note.startStep > cursor) {
      segments.push(...splitAcrossMeasures(cursor, note.startStep - cursor, stepsPerMeasure, null));
    }
    const clippedDuration = Math.min(note.durationSteps, totalSteps - note.startStep);
    if (clippedDuration <= 0) continue;
    segments.push(...splitAcrossMeasures(note.startStep, clippedDuration, stepsPerMeasure, note));
    cursor = note.startStep + clippedDuration;
  }

  if (cursor < totalSteps) {
    segments.push(...splitAcrossMeasures(cursor, totalSteps - cursor, stepsPerMeasure, null));
  }

  // Insère les barres de mesure aux positions correctes.
  return renderSegmentsWithBarLines(segments, stepsPerMeasure);
}

type Segment = { startStep: number; durationSteps: number; note: MusicNote | null };

/**
 * Découpe un intervalle [startStep, startStep+durationSteps) en segments qui
 * ne traversent jamais une frontière de mesure (une note ABC ne doit pas
 * s'étendre au-delà d'une barre de mesure dans notre génération, pour rester
 * dans le sous-ensemble ABC géré par le parseur retour).
 */
function splitAcrossMeasures(
  startStep: number,
  durationSteps: number,
  stepsPerMeasure: number,
  note: MusicNote | null
): Segment[] {
  const segments: Segment[] = [];
  let remaining = durationSteps;
  let cursor = startStep;
  while (remaining > 0) {
    const stepsUntilMeasureEnd = stepsPerMeasure - (cursor % stepsPerMeasure);
    const chunk = Math.min(remaining, stepsUntilMeasureEnd);
    segments.push({ startStep: cursor, durationSteps: chunk, note });
    cursor += chunk;
    remaining -= chunk;
  }
  return segments;
}

function renderSegmentsWithBarLines(segments: Segment[], stepsPerMeasure: number): string {
  const parts: string[] = [];
  let lastMeasureIndex = -1;

  for (const segment of segments) {
    const measureIndex = Math.floor(segment.startStep / stepsPerMeasure);
    if (measureIndex !== lastMeasureIndex) {
      if (lastMeasureIndex !== -1) parts.push("|");
      lastMeasureIndex = measureIndex;
    }
    parts.push(noteOrRestToAbc(segment.note, segment.durationSteps));
  }
  parts.push("|]");

  return parts.join(" ");
}

/**
 * Génère l'en-tête ABC d'une voix et sa directive de programme MIDI. La
 * directive `%%MIDI program` doit être placée sur sa propre ligne pour être
 * interprétée par abcjs comme une commande de la voix active.
 */
function trackHeaderToAbc(track: MusicTrack, voiceNumber: number): string {
  const program = instrumentToMidiProgram(track.instrument);
  const nameEscaped = track.name.replace(/"/g, "'");
  const header = `V:${voiceNumber} name="${nameEscaped}"`;
  const midi = `%%MIDI program ${program}`;
  const meta = `%lucius-track muted=${track.muted ? 1 : 0} solo=${track.solo ? 1 : 0} instrument=${track.instrument}`;
  return `${header}\n${midi}\n${meta}`;
}

/**
 * Convertit un MusicDocument en notation ABC complète, prête à être
 * sauvegardée. Ne valide pas le document : voir validateMusicDocument()
 * (constraints.ts) et validateAbcNotation() (abcValidation.ts, étape 8)
 * pour la validation en amont/aval.
 */
export function musicDocumentToAbc(document: MusicDocument, measureCount: number): string {
  const tracks = document.tracks.slice(0, MAX_TRACKS);
  const titleEscaped = document.title.trim() || "Sans titre";

  const lines: string[] = [
    "X:1",
    `T:${titleEscaped}`,
    `M:${document.meter}`,
    "L:1/16",
    `Q:1/4=${Math.round(document.tempo)}`,
    "K:C",
  ];

  tracks.forEach((track, index) => {
    const voiceNumber = index + 1;
    lines.push(trackHeaderToAbc(track, voiceNumber));
    lines.push(trackToAbcBody(track, document.meter, measureCount));
  });

  return lines.join("\n");
}

export const ABC_INSTRUMENT_LABELS = AVAILABLE_INSTRUMENTS;
