/**
 * Fonctions de construction d'un modèle musical par défaut, respectant
 * systématiquement les contraintes métier (nombre de pistes, plage de
 * hauteurs, mesures supportées, résolution rythmique).
 */
import {
  DEFAULT_INSTRUMENT,
  DEFAULT_METER,
  DEFAULT_TEMPO,
  DEFAULT_VELOCITY,
  MAX_TRACKS,
} from "./constants";
import { midiToLabel } from "./pitch";
import type { MusicDocument, MusicNote, MusicTrack } from "./types";

let idCounter = 0;

/** Génère un identifiant local unique et stable pour une note ou une piste. */
export function generateLocalId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

const TRACK_COLORS = ["#38bdf8", "#f472b6", "#facc15", "#4ade80"];

/** Couleur distincte assignée à une piste, selon son index (0-3). */
export function getTrackColor(trackIndex: number): string {
  return TRACK_COLORS[trackIndex % TRACK_COLORS.length];
}

export function createEmptyTrack(index: number, name?: string): MusicTrack {
  return {
    id: generateLocalId("track"),
    name: name ?? `Piste ${index + 1}`,
    instrument: DEFAULT_INSTRUMENT,
    notes: [],
    muted: false,
    solo: false,
  };
}

export function createEmptyDocument(title = "Nouvelle composition"): MusicDocument {
  const tracks = Array.from({ length: MAX_TRACKS }, (_, i) => createEmptyTrack(i));
  return {
    title,
    tempo: DEFAULT_TEMPO,
    meter: DEFAULT_METER,
    tracks,
    abcNotation: "",
  };
}

export function createNote(params: {
  midi: number;
  startStep: number;
  durationSteps: number;
  velocity?: number;
  isRest?: boolean;
}): MusicNote {
  const { midi, startStep, durationSteps, velocity, isRest } = params;
  return {
    id: generateLocalId("note"),
    pitch: midiToLabel(midi),
    midi,
    startStep,
    durationSteps: Math.max(1, durationSteps),
    velocity: velocity ?? DEFAULT_VELOCITY,
    isRest: isRest ?? false,
  };
}
