/**
 * Petits utilitaires partagés autour de MusicDocument, utilisés à la fois par
 * le service de lecture audio (playback) et par la persistance (API CRUD).
 */
import { DEFAULT_MEASURE_COUNT, getStepsPerMeasure } from "./constants";
import type { MusicDocument } from "./types";

/**
 * Calcule le nombre de mesures nécessaires pour contenir toutes les notes du
 * document (au moins DEFAULT_MEASURE_COUNT si le document est vide).
 */
export function computeMeasureCount(document: MusicDocument): number {
  const stepsPerMeasure = getStepsPerMeasure(document.meter);
  const maxStep = document.tracks.reduce((max, track) => {
    const trackMax = track.notes.reduce((m, n) => Math.max(m, n.startStep + n.durationSteps), 0);
    return Math.max(max, trackMax);
  }, 0);
  if (maxStep === 0) return DEFAULT_MEASURE_COUNT;
  return Math.max(1, Math.ceil(maxStep / stepsPerMeasure));
}

/**
 * Dérive un slug utilisable comme champ `url` (à l'image des Posts) à partir
 * du titre de la composition.
 */
export function slugifyTitle(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "composition";
}
