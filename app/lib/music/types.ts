/**
 * Modèle musical interne du mini-DAW.
 *
 * Ce modèle est la source de vérité manipulée par l'éditeur React. Il est
 * converti vers/depuis la notation ABC (voir abcConversion.ts) uniquement
 * pour la persistance et le rendu de partition.
 */
import type { InstrumentId, Meter } from "./constants";

/** Une note ou un silence dans une piste. */
export type MusicNote = {
  /** Identifiant stable (unique dans la piste), utilisé par React et pour la sélection/édition. */
  id: string;
  /** Nom de hauteur affichable, ex: "C#3". Absent/ignoré pour un silence. */
  pitch: string;
  /** Numéro MIDI correspondant à `pitch`. Doit rester dans [MIN_MIDI_NOTE, MAX_MIDI_NOTE]. */
  midi: number;
  /** Position de début en subdivisions (doubles-croches) depuis le début du morceau. */
  startStep: number;
  /** Durée en subdivisions (doubles-croches). Toujours >= 1. */
  durationSteps: number;
  /** Vélocité MIDI (1-127), optionnelle. */
  velocity?: number;
  /** Marque la note comme un silence (rest) plutôt qu'un son. */
  isRest?: boolean;
};

/** Une piste de la composition (1 instrument, jusqu'à 4 pistes par composition). */
export type MusicTrack = {
  id: string;
  name: string;
  instrument: InstrumentId;
  notes: MusicNote[];
  muted?: boolean;
  solo?: boolean;
};

/** Le document musical complet, unité de sauvegarde/chargement. */
export type MusicDocument = {
  /** Identifiant de persistance (id de la ligne en base). Absent pour un document non encore sauvegardé. */
  id?: string;
  title: string;
  tempo: number;
  meter: Meter;
  tracks: MusicTrack[];
  /**
   * Dernière notation ABC générée/chargée pour ce document.
   * Sert de source pour la sauvegarde et le rendu de partition ;
   * régénérée à chaque modification du modèle interne via musicDocumentToAbc().
   */
  abcNotation: string;
};

/** Résultat d'une validation de notation ABC (voir abcValidation.ts). */
export type AbcValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/** Métadonnées de persistance retournées par l'API (table musicdocuments). */
export type MusicDocumentRecord = {
  id: string;
  url: string;
  name: string;
  content: string; // Notation ABC brute
  tempo: number;
  meter: Meter;
  user_id: string | null;
  created: number;
  edited: number;
};
