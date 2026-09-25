/**
 * Implémentation de MusicPlaybackService basée sur le synthétiseur intégré
 * d'abcjs (abcjs.synth.CreateSynth), qui consomme directement le résultat du
 * parsing ABC (TuneObject) : aucune ressource externe (sample .wav) requise,
 * ce qui en fait un bon point de départ avant d'envisager une implémentation
 * à base de Tone.Sampler si un rendu sonore plus riche est nécessaire.
 *
 * Fonctionnement :
 * - `load()` convertit le MusicDocument en ABC (musicDocumentToAbc), le parse
 *   avec abcjs.parseOnly() pour obtenir un TuneObject, puis initialise un
 *   MidiBuffer (abcjs.synth.CreateSynth()) sur cet objet. L'AudioContext est
 *   créé à cet instant (donc uniquement après une action utilisateur, jamais
 *   au chargement de la page), conformément aux restrictions des navigateurs
 *   et à la contrainte de ne pas faire d'autoplay.
 * - Mute/solo sont traduits en indices de voix ABC (0-based, dans l'ordre des
 *   pistes du document) passés à `voicesOff`. Un changement de mute/solo ou
 *   de tempo pendant la lecture nécessite de réinitialiser le MidiBuffer
 *   (l'API d'abcjs ne permet pas de les modifier "en direct") : la position
 *   de lecture est alors restaurée via `seek()` pour ne pas interrompre
 *   l'écoute de façon perceptible.
 * - La position de lecture est suivie manuellement via `audioContext.currentTime`
 *   (le MidiBuffer d'abcjs n'expose la position que lors d'un `pause()`).
 */
import abcjs from "abcjs";
import type { MidiBuffer, TuneObject } from "abcjs";
import { musicDocumentToAbc } from "../abcConversion";
import { computeMeasureCount } from "../documentUtils";
import type { MusicDocument } from "../types";
import type { MusicPlaybackService, PlaybackLoadResult } from "./MusicPlaybackService";

function computeMutedVoiceIndexes(document: MusicDocument): number[] {
  const hasSolo = document.tracks.some((t) => t.solo);
  const muted: number[] = [];
  document.tracks.forEach((track, index) => {
    const isMuted = hasSolo ? !track.solo : Boolean(track.muted);
    if (isMuted) muted.push(index);
  });
  return muted;
}

export class AbcjsPlaybackService implements MusicPlaybackService {
  private audioContext: AudioContext | null = null;
  private midiBuffer: MidiBuffer | null = null;
  private tune: TuneObject | null = null;
  private document: MusicDocument | null = null;
  private playing = false;
  private endedCallback: (() => void) | null = null;
  private durationSeconds = 0;
  /** Position de lecture (secondes) au dernier arrêt/pause/seek. */
  private positionAtLastActionSeconds = 0;
  /** Horodatage AudioContext.currentTime au moment du dernier démarrage/reprise, pour extrapoler la position courante pendant la lecture. */
  private playbackStartedAtContextTime = 0;

  async load(document: MusicDocument): Promise<PlaybackLoadResult> {
    this.disposeAudioResources();

    const warnings: string[] = [];
    const measureCount = computeMeasureCount(document);
    const abc = musicDocumentToAbc(document, measureCount);

    let tunes: TuneObject[];
    try {
      tunes = abcjs.parseOnly(abc) as unknown as TuneObject[];
    } catch (err) {
      return {
        ok: false,
        warnings: [`Impossible d'interpréter la composition pour la lecture : ${err instanceof Error ? err.message : String(err)}`],
      };
    }

    const tune = tunes?.[0];
    if (!tune) {
      return { ok: false, warnings: ["Impossible d'interpréter la composition pour la lecture."] };
    }

    if (!abcjs.synth.supportsAudio()) {
      return { ok: false, warnings: ["La lecture audio n'est pas supportée par ce navigateur."] };
    }

    this.document = document;
    this.tune = tune;
    this.positionAtLastActionSeconds = 0;

    try {
      this.audioContext = new AudioContext();
      const { midiBuffer, durationSeconds, loadWarnings } = await this.createMidiBuffer(document.tempo);
      this.midiBuffer = midiBuffer;
      this.durationSeconds = durationSeconds;
      warnings.push(...loadWarnings);
      return { ok: true, warnings };
    } catch (err) {
      this.disposeAudioResources();
      return {
        ok: false,
        warnings: [`Erreur lors de la préparation de la lecture audio : ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }

  private async createMidiBuffer(
    tempo: number
  ): Promise<{ midiBuffer: MidiBuffer; durationSeconds: number; loadWarnings: string[] }> {
    if (!this.tune || !this.audioContext || !this.document) {
      throw new Error("Aucune composition chargée.");
    }
    const loadWarnings: string[] = [];
    const midiBuffer = new abcjs.synth.CreateSynth();
    const initResponse = await midiBuffer.init({
      audioContext: this.audioContext,
      visualObj: this.tune,
      options: {
        qpm: tempo,
        voicesOff: computeMutedVoiceIndexes(this.document),
        onEnded: () => {
          this.playing = false;
          this.positionAtLastActionSeconds = 0;
          this.endedCallback?.();
        },
      },
    });
    if (initResponse.error && initResponse.error.length > 0) {
      loadWarnings.push(...initResponse.error.map((e: string) => `Erreur de chargement audio : ${e}`));
    }
    const primeResult = await midiBuffer.prime();
    return { midiBuffer, durationSeconds: primeResult.duration, loadWarnings };
  }

  async play(): Promise<void> {
    if (!this.midiBuffer || !this.audioContext) return;
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    if (this.positionAtLastActionSeconds > 0) {
      this.midiBuffer.seek(this.positionAtLastActionSeconds, "seconds");
      this.midiBuffer.resume();
    } else {
      this.midiBuffer.start();
    }
    this.playbackStartedAtContextTime = this.audioContext.currentTime;
    this.playing = true;
  }

  pause(): void {
    if (!this.midiBuffer || !this.playing) return;
    this.positionAtLastActionSeconds = this.midiBuffer.pause();
    this.playing = false;
  }

  stop(): void {
    if (!this.midiBuffer) return;
    this.midiBuffer.stop();
    this.positionAtLastActionSeconds = 0;
    this.playing = false;
  }

  setTempo(tempo: number): void {
    if (!this.document) return;
    this.document = { ...this.document, tempo };
    void this.reinitializeKeepingPosition(() => this.createMidiBuffer(tempo));
  }

  setMutedTracks(mutedTrackIndexes: number[]): void {
    if (!this.document) return;
    this.document = {
      ...this.document,
      tracks: this.document.tracks.map((track, index) => ({
        ...track,
        muted: mutedTrackIndexes.includes(index),
        solo: false,
      })),
    };
    void this.reinitializeKeepingPosition(() => this.createMidiBuffer(this.document!.tempo));
  }

  /**
   * Recharge le MidiBuffer (nécessaire car abcjs ne permet pas de modifier le
   * tempo ou voicesOff sur un buffer déjà initialisé) en conservant la
   * position de lecture et l'état lecture/pause courants.
   */
  private async reinitializeKeepingPosition(
    factory: () => Promise<{ midiBuffer: MidiBuffer; durationSeconds: number; loadWarnings: string[] }>
  ): Promise<void> {
    if (!this.midiBuffer || !this.tune) return;

    const wasPlaying = this.playing;
    const resumeAtSeconds = wasPlaying ? this.midiBuffer.pause() : this.positionAtLastActionSeconds;
    this.playing = false;

    try {
      const { midiBuffer, durationSeconds } = await factory();
      this.midiBuffer = midiBuffer;
      this.durationSeconds = durationSeconds;
      this.positionAtLastActionSeconds = resumeAtSeconds;
      if (resumeAtSeconds > 0) {
        midiBuffer.seek(resumeAtSeconds, "seconds");
      }
      if (wasPlaying) {
        midiBuffer.resume();
        this.playing = true;
        this.playbackStartedAtContextTime = this.audioContext?.currentTime ?? 0;
      }
    } catch {
      // En cas d'échec de la réinitialisation (ex: contexte audio fermé), la
      // nouvelle valeur (tempo/mute) sera appliquée au prochain load() complet.
    }
  }

  getCurrentPositionMs(): number {
    if (!this.audioContext) return 0;
    if (this.playing) {
      const elapsed = this.audioContext.currentTime - this.playbackStartedAtContextTime;
      return (this.positionAtLastActionSeconds + elapsed) * 1000;
    }
    return this.positionAtLastActionSeconds * 1000;
  }

  getDurationMs(): number {
    return this.durationSeconds * 1000;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  onPlaybackEnded(callback: () => void): void {
    this.endedCallback = callback;
  }

  dispose(): void {
    this.disposeAudioResources();
    this.endedCallback = null;
  }

  private disposeAudioResources(): void {
    try {
      this.midiBuffer?.stop();
    } catch {
      // ignore
    }
    this.midiBuffer = null;
    this.tune = null;
    this.document = null;
    this.playing = false;
    this.durationSeconds = 0;
    this.positionAtLastActionSeconds = 0;
    this.playbackStartedAtContextTime = 0;
    if (this.audioContext) {
      void this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
