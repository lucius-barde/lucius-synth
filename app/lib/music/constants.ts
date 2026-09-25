/**
 * Constantes de configuration du mini-DAW.
 *
 * Toutes les limites métier (nombre de pistes, plage de hauteurs, mesures
 * supportées, résolution rythmique, tempo) sont centralisées ici afin de
 * pouvoir être ajustées facilement sans avoir à modifier la logique
 * applicative (éditeur, conversion ABC, validation).
 */

/** Nombre maximal de pistes dans une composition. */
export const MAX_TRACKS = 4;

/**
 * Plage de hauteurs autorisée, exprimée en numéros MIDI.
 *
 * Plage chromatique
 * Cette plage est volontairement facile à modifier : il suffit de changer
 * ces deux constantes.
 */
export const MIN_MIDI_NOTE = 24; // C1
export const MAX_MIDI_NOTE = 84; // C6

/** Convention d'affichage retenue pour les altérations : dièses uniquement. */
export const NOTE_NAMES_SHARP = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

/** Mesures ("meters") supportées par l'application. */
export const SUPPORTED_METERS = ["2/4", "3/4", "4/4", "6/8", "9/8"] as const;

export type Meter = (typeof SUPPORTED_METERS)[number];

/**
 * Résolution rythmique maximale : la double-croche.
 * `L:1/16` en notation ABC correspond à une "step" dans notre modèle interne.
 */
export const STEPS_PER_QUARTER_NOTE = 4;

/**
 * Nombre de subdivisions (doubles-croches) par mesure, selon la mesure.
 *
 * - 2/4 : 2 temps de croche x 4 double-croches = 8
 * - 3/4 : 3 temps de croche x 4 double-croches = 12
 * - 4/4 : 4 temps de croche x 4 double-croches = 16
 * - 6/8 : 2 temps de croche pointée x 6 double-croches = 12
 * - 9/8 : 3 temps de croche pointée x 6 double-croches = 18
 */
export const STEPS_PER_MEASURE: Record<Meter, number> = {
  "2/4": 8,
  "3/4": 12,
  "4/4": 16,
  "6/8": 12,
  "9/8": 18,
};

/** Nombre de "temps forts" (beats) par mesure, utilisé pour l'affichage de la grille. */
export const BEATS_PER_MEASURE: Record<Meter, number> = {
  "2/4": 2,
  "3/4": 3,
  "4/4": 4,
  "6/8": 2,
  "9/8": 3,
};

/** Nombre de subdivisions (doubles-croches) par temps fort affiché. */
export const STEPS_PER_BEAT: Record<Meter, number> = {
  "2/4": 4,
  "3/4": 4,
  "4/4": 4,
  "6/8": 6,
  "9/8": 6,
};

/** Tempo minimal et maximal autorisés (en noires par minute). */
export const MIN_TEMPO = 60;
export const MAX_TEMPO = 180;
export const DEFAULT_TEMPO = 104;

/** Mesure par défaut d'une nouvelle composition. */
export const DEFAULT_METER: Meter = "4/4";

/** Nombre de mesures par défaut à afficher/créer pour une nouvelle piste. */
export const DEFAULT_MEASURE_COUNT = 4;

/** Instruments disponibles pour une piste (identifiants stables utilisés en persistance). */
export const AVAILABLE_INSTRUMENTS = [
  { id: "piano", label: "Piano" },
  { id: "bass", label: "Basse" },
  { id: "guitar", label: "Guitare" },
  { id: "flute", label: "Flûte" },
  { id: "violin", label: "Violon" },
  { id: "harp", label: "Harpe" },
  { id: "percussion", label: "Tambours" },
] as const;

export type InstrumentId = (typeof AVAILABLE_INSTRUMENTS)[number]["id"];

export const DEFAULT_INSTRUMENT: InstrumentId = "piano";

/** Durées proposées pour les notes ajoutées dans la grille. */
export const NOTE_DURATIONS = [
  { value: "1/16", steps: 1 },
  { value: "1/8", steps: 2 },
  { value: "1/4", steps: 4 },
  { value: "1/2", steps: 8 },
] as const;

export type NoteDuration = (typeof NOTE_DURATIONS)[number]["value"];

/** Durée par défaut d'une note créée dans la grille (une croche). */
export const DEFAULT_NOTE_DURATION: NoteDuration = "1/8";

export function getNoteDurationSteps(duration: NoteDuration): number {
  return NOTE_DURATIONS.find((option) => option.value === duration)?.steps ?? 2;
}

/** Vélocité MIDI par défaut appliquée à une note nouvellement créée. */
export const DEFAULT_VELOCITY = 100;

export function isSupportedMeter(value: string): value is Meter {
  return (SUPPORTED_METERS as readonly string[]).includes(value);
}

export function getStepsPerMeasure(meter: Meter): number {
  return STEPS_PER_MEASURE[meter];
}
