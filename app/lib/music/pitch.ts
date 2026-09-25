/**
 * Utilitaires de conversion de hauteurs (pitch) pour le mini-DAW.
 *
 * Convention retenue : altérations affichées en dièse uniquement
 * (C, C#, D, D#, E, F, F#, G, G#, A, A#, B), cohérente avec la clé ABC "K:C"
 * utilisée pour la génération de la notation (voir abcConversion.ts).
 */
import { MAX_MIDI_NOTE, MIN_MIDI_NOTE, NOTE_NAMES_SHARP } from "./constants";

/** Représente une hauteur exploitable par l'interface (note + octave + midi). */
export type PitchInfo = {
  midi: number;
  /** Nom de la note sans octave, ex: "C#" */
  name: string;
  /** Octave scientifique, ex: 3 pour C3 (MIDI 60 = C4 selon la convention MIDI standard) */
  octave: number;
  /** Nom complet affichable, ex: "C#3" */
  label: string;
};

/**
 * Convertit un numéro MIDI en informations de hauteur affichables.
 * Utilise la convention scientifique standard : MIDI 60 = C4.
 */
export function midiToPitchInfo(midi: number): PitchInfo {
  const name = NOTE_NAMES_SHARP[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return {
    midi,
    name,
    octave,
    label: `${name}${octave}`,
  };
}

export function midiToLabel(midi: number): string {
  return midiToPitchInfo(midi).label;
}

/** Vérifie qu'un numéro MIDI est dans la plage autorisée par l'application. */
export function isMidiInRange(midi: number, min = MIN_MIDI_NOTE, max = MAX_MIDI_NOTE): boolean {
  return Number.isInteger(midi) && midi >= min && midi <= max;
}

/** Retourne la liste ordonnée (grave -> aigu) des numéros MIDI disponibles dans la plage configurée. */
export function getAvailableMidiRange(min = MIN_MIDI_NOTE, max = MAX_MIDI_NOTE): number[] {
  const notes: number[] = [];
  for (let midi = min; midi <= max; midi++) {
    notes.push(midi);
  }
  return notes;
}

/** Retourne la liste ordonnée (grave -> aigu) des hauteurs disponibles, prêtes à afficher. */
export function getAvailablePitches(min = MIN_MIDI_NOTE, max = MAX_MIDI_NOTE): PitchInfo[] {
  return getAvailableMidiRange(min, max).map(midiToPitchInfo);
}

/** Clamp un numéro MIDI à l'intérieur de la plage autorisée. */
export function clampMidiToRange(midi: number, min = MIN_MIDI_NOTE, max = MAX_MIDI_NOTE): number {
  return Math.min(max, Math.max(min, midi));
}

/**
 * Décale un numéro MIDI d'un nombre de demi-tons donné, en le maintenant
 * dans la plage autorisée. Utilisé par l'UI pour les boutons +/- demi-ton.
 * Retourne `null` si le décalage sortirait de la plage (aucun changement à appliquer).
 */
export function shiftMidiWithinRange(
  midi: number,
  semitones: number,
  min = MIN_MIDI_NOTE,
  max = MAX_MIDI_NOTE
): number | null {
  const next = midi + semitones;
  return isMidiInRange(next, min, max) ? next : null;
}

const NOTE_NAME_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  DB: 1,
  D: 2,
  "D#": 3,
  EB: 3,
  E: 4,
  F: 5,
  "F#": 6,
  GB: 6,
  G: 7,
  "G#": 8,
  AB: 8,
  A: 9,
  "A#": 10,
  BB: 10,
  B: 11,
};

/**
 * Convertit un nom de note scientifique (ex: "C#3", "Db3", "A4") en numéro MIDI.
 * Retourne `null` si le nom n'est pas reconnu.
 */
export function noteNameToMidi(label: string): number | null {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(label.trim());
  if (!match) return null;
  const [, letter, accidental, octaveStr] = match;
  const key = `${letter.toUpperCase()}${accidental === "#" ? "#" : accidental === "b" ? "B" : ""}`;
  const semitone = NOTE_NAME_TO_SEMITONE[key];
  if (semitone === undefined) return null;
  const octave = Number(octaveStr);
  return (octave + 1) * 12 + semitone;
}
