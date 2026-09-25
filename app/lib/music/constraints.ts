/**
 * Garde-fous métier centralisés, réutilisés à la fois par l'éditeur (pour
 * empêcher la création d'éléments invalides) et par la validation ABC
 * (voir abcValidation.ts) pour appliquer les mêmes règles aux documents
 * chargés depuis la base de données.
 */
import {
  MAX_MIDI_NOTE,
  MAX_TEMPO,
  MAX_TRACKS,
  MIN_MIDI_NOTE,
  MIN_TEMPO,
  getStepsPerMeasure,
  isSupportedMeter,
  type Meter,
} from "./constants";
import { isMidiInRange } from "./pitch";
import type { MusicDocument, MusicNote, MusicTrack } from "./types";

export function isTempoValid(tempo: number): boolean {
  return Number.isFinite(tempo) && tempo >= MIN_TEMPO && tempo <= MAX_TEMPO;
}

export function isTrackCountValid(tracks: MusicTrack[]): boolean {
  return tracks.length > 0 && tracks.length <= MAX_TRACKS;
}

export function isNoteDurationValid(durationSteps: number): boolean {
  return Number.isInteger(durationSteps) && durationSteps >= 1;
}

export function isNotePitchValid(midi: number): boolean {
  return isMidiInRange(midi, MIN_MIDI_NOTE, MAX_MIDI_NOTE);
}

/**
 * Vérifie qu'une note reste dans les limites de la mesure qui la contient
 * (ne dépasse pas le nombre total de subdivisions du morceau).
 */
export function isNoteWithinMeasureBounds(
  note: Pick<MusicNote, "startStep" | "durationSteps">,
  totalSteps: number
): boolean {
  return note.startStep >= 0 && note.startStep + note.durationSteps <= totalSteps;
}

export function clampNoteDuration(durationSteps: number, maxSteps: number): number {
  return Math.min(Math.max(1, Math.round(durationSteps)), Math.max(1, maxSteps));
}

/**
 * Valide l'intégralité d'un MusicDocument par rapport aux contraintes de
 * l'application (nombre de pistes, plage de hauteurs, mesure supportée,
 * tempo, durées). Utilisée en amont de la conversion vers ABC et avant
 * sauvegarde.
 */
export function validateMusicDocument(doc: MusicDocument): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!doc.title || !doc.title.trim()) {
    errors.push("Le titre de la composition est obligatoire.");
  }

  if (!isTempoValid(doc.tempo)) {
    errors.push(`Le tempo doit être compris entre ${MIN_TEMPO} et ${MAX_TEMPO}.`);
  }

  if (!isSupportedMeter(doc.meter)) {
    errors.push(`La mesure "${doc.meter}" n'est pas supportée.`);
  }

  if (!isTrackCountValid(doc.tracks)) {
    errors.push(`Le document doit contenir entre 1 et ${MAX_TRACKS} pistes.`);
  }

  const meter: Meter | null = isSupportedMeter(doc.meter) ? doc.meter : null;

  doc.tracks.forEach((track, trackIndex) => {
    track.notes.forEach((note) => {
      if (!isNotePitchValid(note.midi) && !note.isRest) {
        errors.push(
          `Piste ${trackIndex + 1} : la note "${note.pitch}" (MIDI ${note.midi}) est hors de la plage autorisée (${MIN_MIDI_NOTE}-${MAX_MIDI_NOTE}).`
        );
      }
      if (!isNoteDurationValid(note.durationSteps)) {
        errors.push(
          `Piste ${trackIndex + 1} : la durée de la note "${note.id}" n'est pas un multiple valide de double-croche.`
        );
      }
      if (meter) {
        const stepsPerMeasure = getStepsPerMeasure(meter);
        const totalMeasures = Math.max(1, Math.ceil((note.startStep + note.durationSteps) / stepsPerMeasure));
        const totalSteps = totalMeasures * stepsPerMeasure;
        if (!isNoteWithinMeasureBounds(note, totalSteps)) {
          errors.push(`Piste ${trackIndex + 1} : la note "${note.id}" dépasse les limites de la mesure.`);
        }
      }
    });
  });

  return { valid: errors.length === 0, errors };
}
