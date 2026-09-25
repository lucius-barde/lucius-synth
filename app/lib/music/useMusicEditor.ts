"use client";

/**
 * Hook central de l'éditeur musical : centralise l'état d'un MusicDocument en
 * cours d'édition et toutes les actions qui le font évoluer, en appliquant
 * systématiquement les contraintes métier (voir constraints.ts) afin que
 * l'interface ne puisse jamais produire un document invalide.
 *
 * Ce hook ne gère pas la persistance (sauvegarde/chargement API) : il expose
 * uniquement `document`/`setDocument` et les actions d'édition. La
 * persistance est branchée par le composant racine (DawEditor) à l'étape 11.
 */
import { useCallback, useMemo, useReducer } from "react";
import {
  DEFAULT_INSTRUMENT,
  MAX_MIDI_NOTE,
  MAX_TRACKS,
  MIN_MIDI_NOTE,
  getStepsPerMeasure,
  type InstrumentId,
  type Meter,
} from "./constants";
import { clampNoteDuration, isNotePitchValid, isTempoValid } from "./constraints";
import { createEmptyDocument, createNote } from "./factory";
import { clampMidiToRange, midiToLabel } from "./pitch";
import type { MusicDocument, MusicNote, MusicTrack } from "./types";

export type EditorSelection = {
  trackId: string;
  noteId: string;
} | null;

type State = {
  document: MusicDocument;
  activeTrackId: string;
  selection: EditorSelection;
  /** Nombre de mesures affichées/éditables dans la grille. */
  measureCount: number;
};

type Action =
  | { type: "SET_DOCUMENT"; document: MusicDocument; measureCount?: number }
  | { type: "SET_DOCUMENT_ID"; id: string }
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_TEMPO"; tempo: number }
  | { type: "SET_METER"; meter: Meter }
  | { type: "SET_ACTIVE_TRACK"; trackId: string }
  | { type: "SET_TRACK_INSTRUMENT"; trackId: string; instrument: InstrumentId }
  | { type: "SET_TRACK_NAME"; trackId: string; name: string }
  | { type: "TOGGLE_TRACK_MUTE"; trackId: string }
  | { type: "TOGGLE_TRACK_SOLO"; trackId: string }
  | { type: "ADD_MEASURE" }
  | { type: "REMOVE_MEASURE" }
  | {
      type: "ADD_NOTE";
      trackId: string;
      midi: number;
      startStep: number;
      durationSteps?: number;
    }
  | { type: "DELETE_NOTE"; trackId: string; noteId: string }
  | { type: "MOVE_NOTE"; trackId: string; noteId: string; startStep: number; midi?: number }
  | { type: "SET_NOTE_PITCH"; trackId: string; noteId: string; midi: number }
  | { type: "SET_NOTE_DURATION"; trackId: string; noteId: string; durationSteps: number }
  | { type: "SELECT_NOTE"; trackId: string; noteId: string }
  | { type: "CLEAR_SELECTION" };

function mapTrack(doc: MusicDocument, trackId: string, fn: (track: MusicTrack) => MusicTrack): MusicDocument {
  return {
    ...doc,
    tracks: doc.tracks.map((t) => (t.id === trackId ? fn(t) : t)),
  };
}

function totalStepsFor(meter: Meter, measureCount: number): number {
  return getStepsPerMeasure(meter) * measureCount;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DOCUMENT": {
      const firstTrackId = action.document.tracks[0]?.id ?? "";
      return {
        document: action.document,
        activeTrackId: firstTrackId,
        selection: null,
        measureCount: action.measureCount ?? state.measureCount,
      };
    }

    case "SET_DOCUMENT_ID":
      return { ...state, document: { ...state.document, id: action.id } };

    case "SET_TITLE":
      return { ...state, document: { ...state.document, title: action.title } };

    case "SET_TEMPO": {
      if (!isTempoValid(action.tempo)) return state;
      return { ...state, document: { ...state.document, tempo: action.tempo } };
    }

    case "SET_METER":
      return { ...state, document: { ...state.document, meter: action.meter } };

    case "SET_ACTIVE_TRACK":
      return { ...state, activeTrackId: action.trackId };

    case "SET_TRACK_INSTRUMENT":
      return {
        ...state,
        document: mapTrack(state.document, action.trackId, (t) => ({ ...t, instrument: action.instrument })),
      };

    case "SET_TRACK_NAME":
      return {
        ...state,
        document: mapTrack(state.document, action.trackId, (t) => ({ ...t, name: action.name })),
      };

    case "TOGGLE_TRACK_MUTE":
      return {
        ...state,
        document: mapTrack(state.document, action.trackId, (t) => ({ ...t, muted: !t.muted })),
      };

    case "TOGGLE_TRACK_SOLO":
      return {
        ...state,
        document: mapTrack(state.document, action.trackId, (t) => ({ ...t, solo: !t.solo })),
      };

    case "ADD_MEASURE":
      return { ...state, measureCount: state.measureCount + 1 };

    case "REMOVE_MEASURE": {
      if (state.measureCount <= 1) return state;
      const nextMeasureCount = state.measureCount - 1;
      const totalSteps = totalStepsFor(state.document.meter, nextMeasureCount);
      // Supprime les notes qui dépasseraient la nouvelle longueur du morceau.
      const document: MusicDocument = {
        ...state.document,
        tracks: state.document.tracks.map((t) => ({
          ...t,
          notes: t.notes.filter((n) => n.startStep + n.durationSteps <= totalSteps),
        })),
      };
      return { ...state, document, measureCount: nextMeasureCount };
    }

    case "ADD_NOTE": {
      const trackIndex = state.document.tracks.findIndex((t) => t.id === action.trackId);
      if (trackIndex === -1) return state;
      if (!isNotePitchValid(action.midi)) return state;

      const stepsPerMeasure = getStepsPerMeasure(state.document.meter);
      const totalSteps = totalStepsFor(state.document.meter, state.measureCount);
      if (action.startStep < 0 || action.startStep >= totalSteps) return state;

      const track = state.document.tracks[trackIndex];
      const maxDurationAtPosition = Math.min(
        action.durationSteps ?? 2,
        totalSteps - action.startStep
      );

      // Empêche la superposition avec une note existante sur la même piste.
      const overlaps = track.notes.some(
        (n) => action.startStep < n.startStep + n.durationSteps && n.startStep < action.startStep + maxDurationAtPosition
      );
      if (overlaps) return state;

      const note = createNote({
        midi: clampMidiToRange(action.midi),
        startStep: action.startStep,
        durationSteps: clampNoteDuration(maxDurationAtPosition, stepsPerMeasure * state.measureCount),
      });

      return {
        ...state,
        document: mapTrack(state.document, action.trackId, (t) => ({ ...t, notes: [...t.notes, note] })),
        selection: { trackId: action.trackId, noteId: note.id },
      };
    }

    case "DELETE_NOTE": {
      const document = mapTrack(state.document, action.trackId, (t) => ({
        ...t,
        notes: t.notes.filter((n) => n.id !== action.noteId),
      }));
      const selection =
        state.selection?.noteId === action.noteId ? null : state.selection;
      return { ...state, document, selection };
    }

    case "MOVE_NOTE": {
      const totalSteps = totalStepsFor(state.document.meter, state.measureCount);
      const document = mapTrack(state.document, action.trackId, (t) => {
        const note = t.notes.find((n) => n.id === action.noteId);
        if (!note) return t;
        const nextStart = Math.max(0, Math.min(action.startStep, totalSteps - note.durationSteps));
        const nextMidi = action.midi !== undefined ? clampMidiToRange(action.midi) : note.midi;

        const overlaps = t.notes.some(
          (n) =>
            n.id !== note.id &&
            nextStart < n.startStep + n.durationSteps &&
            n.startStep < nextStart + note.durationSteps
        );
        if (overlaps) return t;

        return {
          ...t,
          notes: t.notes.map((n) =>
            n.id === note.id
              ? { ...n, startStep: nextStart, midi: nextMidi, pitch: midiToLabel(nextMidi) }
              : n
          ),
        };
      });
      return { ...state, document };
    }

    case "SET_NOTE_PITCH": {
      if (!isNotePitchValid(action.midi)) return state;
      const document = mapTrack(state.document, action.trackId, (t) => ({
        ...t,
        notes: t.notes.map((n) =>
          n.id === action.noteId ? { ...n, midi: action.midi, pitch: midiToLabel(action.midi) } : n
        ),
      }));
      return { ...state, document };
    }

    case "SET_NOTE_DURATION": {
      const totalSteps = totalStepsFor(state.document.meter, state.measureCount);
      const document = mapTrack(state.document, action.trackId, (t) => {
        const note = t.notes.find((n) => n.id === action.noteId);
        if (!note) return t;
        const maxDuration = totalSteps - note.startStep;
        const nextDuration = clampNoteDuration(action.durationSteps, maxDuration);

        const overlaps = t.notes.some(
          (n) =>
            n.id !== note.id &&
            note.startStep < n.startStep + n.durationSteps &&
            n.startStep < note.startStep + nextDuration
        );
        if (overlaps) return t;

        return {
          ...t,
          notes: t.notes.map((n) => (n.id === note.id ? { ...n, durationSteps: nextDuration } : n)),
        };
      });
      return { ...state, document };
    }

    case "SELECT_NOTE":
      return { ...state, selection: { trackId: action.trackId, noteId: action.noteId } };

    case "CLEAR_SELECTION":
      return { ...state, selection: null };

    default:
      return state;
  }
}


function createInitialState(): State {
  return {
    document: createEmptyDocument(),
    activeTrackId: "",
    selection: null,
    measureCount: 4,
  };
}

export function useMusicEditor() {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const initial = createInitialState();
    return { ...initial, activeTrackId: initial.document.tracks[0]?.id ?? "" };
  });

  const totalSteps = useMemo(
    () => totalStepsFor(state.document.meter, state.measureCount),
    [state.document.meter, state.measureCount]
  );

  const activeTrack = useMemo(
    () => state.document.tracks.find((t) => t.id === state.activeTrackId) ?? state.document.tracks[0],
    [state.document.tracks, state.activeTrackId]
  );

  const loadDocument = useCallback((document: MusicDocument, measureCount: number) => {
    dispatch({ type: "SET_DOCUMENT", document, measureCount });
  }, []);

  const resetDocument = useCallback(() => {
    dispatch({ type: "SET_DOCUMENT", document: createEmptyDocument(), measureCount: 4 });
  }, []);

  const setDocumentId = useCallback((id: string) => dispatch({ type: "SET_DOCUMENT_ID", id }), []);
  const setTitle = useCallback((title: string) => dispatch({ type: "SET_TITLE", title }), []);
  const setTempo = useCallback((tempo: number) => dispatch({ type: "SET_TEMPO", tempo }), []);
  const setMeter = useCallback((meter: Meter) => dispatch({ type: "SET_METER", meter }), []);
  const setActiveTrack = useCallback((trackId: string) => dispatch({ type: "SET_ACTIVE_TRACK", trackId }), []);
  const setTrackInstrument = useCallback(
    (trackId: string, instrument: InstrumentId) => dispatch({ type: "SET_TRACK_INSTRUMENT", trackId, instrument }),
    []
  );
  const setTrackName = useCallback(
    (trackId: string, name: string) => dispatch({ type: "SET_TRACK_NAME", trackId, name }),
    []
  );
  const toggleTrackMute = useCallback((trackId: string) => dispatch({ type: "TOGGLE_TRACK_MUTE", trackId }), []);
  const toggleTrackSolo = useCallback((trackId: string) => dispatch({ type: "TOGGLE_TRACK_SOLO", trackId }), []);
  const addMeasure = useCallback(() => dispatch({ type: "ADD_MEASURE" }), []);
  const removeMeasure = useCallback(() => dispatch({ type: "REMOVE_MEASURE" }), []);

  const addNote = useCallback(
    (trackId: string, midi: number, startStep: number, durationSteps?: number) =>
      dispatch({ type: "ADD_NOTE", trackId, midi, startStep, durationSteps }),
    []
  );
  const deleteNote = useCallback(
    (trackId: string, noteId: string) => dispatch({ type: "DELETE_NOTE", trackId, noteId }),
    []
  );
  const moveNote = useCallback(
    (trackId: string, noteId: string, startStep: number, midi?: number) =>
      dispatch({ type: "MOVE_NOTE", trackId, noteId, startStep, midi }),
    []
  );
  const setNotePitch = useCallback(
    (trackId: string, noteId: string, midi: number) => dispatch({ type: "SET_NOTE_PITCH", trackId, noteId, midi }),
    []
  );
  const setNoteDuration = useCallback(
    (trackId: string, noteId: string, durationSteps: number) =>
      dispatch({ type: "SET_NOTE_DURATION", trackId, noteId, durationSteps }),
    []
  );
  const selectNote = useCallback(
    (trackId: string, noteId: string) => dispatch({ type: "SELECT_NOTE", trackId, noteId }),
    []
  );
  const clearSelection = useCallback(() => dispatch({ type: "CLEAR_SELECTION" }), []);

  return {
    document: state.document,
    activeTrackId: state.activeTrackId,
    activeTrack,
    selection: state.selection,
    measureCount: state.measureCount,
    totalSteps,
    loadDocument,
    resetDocument,
    setDocumentId,
    setTitle,
    setTempo,
    setMeter,
    setActiveTrack,
    setTrackInstrument,
    setTrackName,
    toggleTrackMute,
    toggleTrackSolo,
    addMeasure,
    removeMeasure,
    addNote,
    deleteNote,
    moveNote,
    setNotePitch,
    setNoteDuration,
    selectNote,
    clearSelection,
  };
}

export const MAX_TRACKS_LIMIT = MAX_TRACKS;
export const MIDI_RANGE = { min: MIN_MIDI_NOTE, max: MAX_MIDI_NOTE };
export const DEFAULT_TRACK_INSTRUMENT = DEFAULT_INSTRUMENT;
