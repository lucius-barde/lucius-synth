/**
 * Abstraction du moteur de lecture audio du mini-DAW.
 *
 * Cette interface est volontairement indépendante de toute bibliothèque
 * audio précise : la première implémentation (AbcjsPlaybackService) utilise
 * le synthétiseur intégré d'abcjs, mais une future implémentation basée sur
 * Tone.Sampler (lecture avec de vrais samples .wav) pourra respecter la même
 * interface sans impacter le reste de l'application (voir usePlaybackService.ts,
 * qui est le seul point de couplage entre l'UI et une implémentation concrète).
 */
import type { MusicDocument } from "../types";

/** Résultat de `load()` : signale les pistes dont le chargement a échoué (ex: sample manquant), sans bloquer les autres. */
export type PlaybackLoadResult = {
  /** true si le document a pu être chargé et est jouable (même partiellement). */
  ok: boolean;
  /** Messages d'erreur/avertissement non bloquants (ex: échec de chargement d'un sample). */
  warnings: string[];
};

export interface MusicPlaybackService {
  /**
   * Prépare la lecture d'un document musical. Doit être appelé après une
   * interaction utilisateur explicite (ex: clic sur Play), afin de respecter
   * les restrictions des navigateurs sur la création d'un AudioContext.
   * Remplace toute lecture précédemment chargée.
   */
  load(document: MusicDocument): Promise<PlaybackLoadResult>;

  /** Démarre ou reprend la lecture depuis la position courante (0 après un stop). */
  play(): Promise<void>;

  /** Suspend la lecture sans réinitialiser la position. */
  pause(): void;

  /** Arrête la lecture et revient au début. */
  stop(): void;

  /** Modifie le tempo de lecture (en noires par minute), y compris pendant la lecture. */
  setTempo(tempo: number): void;

  /**
   * Modifie l'état muet/solo des pistes sans recharger le document. `mutedTrackIndexes`
   * contient les index (0-based, dans l'ordre des pistes du document chargé) des pistes
   * à ne pas jouer.
   */
  setMutedTracks(mutedTrackIndexes: number[]): void;

  /** Position de lecture actuelle, en millisecondes depuis le début. */
  getCurrentPositionMs(): number;

  /** Durée totale du document chargé, en millisecondes. */
  getDurationMs(): number;

  /** Indique si la lecture est en cours. */
  isPlaying(): boolean;

  /** Enregistre un callback appelé lorsque la lecture atteint la fin du morceau. */
  onPlaybackEnded(callback: () => void): void;

  /** Libère les ressources audio (à appeler au démontage du composant ou avant de charger un nouveau document indépendant). */
  dispose(): void;
}
