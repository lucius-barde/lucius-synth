"use client";

/**
 * Hook React reliant l'UI (TopBar/DawEditor) au service de lecture audio
 * (voir MusicPlaybackService). C'est le seul point de couplage entre
 * l'application et l'implémentation concrète (AbcjsPlaybackService pour
 * l'instant) : remplacer le moteur audio (ex: par une implémentation
 * Tone.Sampler) ne nécessite de modifier que la fabrique `createService`
 * ci-dessous.
 *
 * Respecte la contrainte "pas d'autoplay" : aucune ressource audio
 * (AudioContext, MidiBuffer) n'est créée avant un appel explicite à `play()`
 * déclenché par une interaction utilisateur (clic sur le bouton Play).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AbcjsPlaybackService } from "./AbcjsPlaybackService";
import type { MusicPlaybackService } from "./MusicPlaybackService";
import type { MusicDocument } from "../types";

export type PlaybackState = "stopped" | "loading" | "playing" | "paused" | "error";

function createService(): MusicPlaybackService {
  return new AbcjsPlaybackService();
}

export function usePlaybackService() {
  const serviceRef = useRef<MusicPlaybackService | null>(null);
  const [state, setState] = useState<PlaybackState>("stopped");
  const [warnings, setWarnings] = useState<string[]>([]);
  /** Document actuellement chargé dans le service (pour éviter un rechargement inutile si inchangé). */
  const loadedDocumentRef = useRef<MusicDocument | null>(null);

  useEffect(() => {
    return () => {
      serviceRef.current?.dispose();
      serviceRef.current = null;
    };
  }, []);

  const ensureService = useCallback((): MusicPlaybackService => {
    if (!serviceRef.current) {
      serviceRef.current = createService();
      serviceRef.current.onPlaybackEnded(() => {
        setState("stopped");
      });
    }
    return serviceRef.current;
  }, []);

  /**
   * Charge (ou recharge) le document dans le service, puis démarre la lecture.
   * Toujours appelé depuis un gestionnaire de clic (bouton Play), jamais
   * automatiquement, pour respecter les restrictions d'autoplay.
   */
  const play = useCallback(
    async (document: MusicDocument) => {
      const service = ensureService();
      setState("loading");
      setWarnings([]);

      // Si l'état "en pause" correspond déjà au document demandé, on reprend
      // simplement la lecture sans recharger (préserve la position).
      const alreadyLoadedSameDocument = loadedDocumentRef.current === document;
      if (!alreadyLoadedSameDocument) {
        const result = await service.load(document);
        loadedDocumentRef.current = alreadyLoadedSameDocument ? loadedDocumentRef.current : document;
        if (!result.ok) {
          setState("error");
          setWarnings(result.warnings);
          return;
        }
        loadedDocumentRef.current = document;
        setWarnings(result.warnings);
      }

      try {
        await service.play();
        setState("playing");
      } catch (err) {
        setState("error");
        setWarnings([err instanceof Error ? err.message : String(err)]);
      }
    },
    [ensureService]
  );

  const pause = useCallback(() => {
    serviceRef.current?.pause();
    setState("paused");
  }, []);

  const stop = useCallback(() => {
    serviceRef.current?.stop();
    setState("stopped");
  }, []);

  const setTempo = useCallback((tempo: number) => {
    serviceRef.current?.setTempo(tempo);
  }, []);

  const setMutedTracks = useCallback((mutedTrackIndexes: number[]) => {
    serviceRef.current?.setMutedTracks(mutedTrackIndexes);
  }, []);

  /** Invalide le document chargé : le prochain play() rechargera depuis zéro (ex: après une édition). */
  const invalidateLoadedDocument = useCallback(() => {
    loadedDocumentRef.current = null;
  }, []);

  return {
    state,
    warnings,
    play,
    pause,
    stop,
    setTempo,
    setMutedTracks,
    invalidateLoadedDocument,
  };
}
