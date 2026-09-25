"use client";

/**
 * Barre supérieure de l'éditeur musical : titre, actions de fichier
 * (Nouvelle / Ouvrir / Sauvegarder), transport (Play/Pause/Stop), état de
 * sauvegarde et erreurs de validation ABC.
 *
 * Ce composant est purement présentationnel : toute la logique (transport
 * audio, persistance) est fournie par le composant parent via des props.
 */
import type { ChangeEvent } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type PlaybackStatus = "stopped" | "playing" | "paused";

type TopBarProps = {
  title: string;
  onTitleChange: (title: string) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  canSave: boolean;
  saveStatus: SaveStatus;
  saveMessage?: string;
  playbackStatus: PlaybackStatus;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  playbackDisabled?: boolean;
  /** Chargement audio en cours (ex: préparation du synthétiseur après un clic sur Play). */
  playbackLoading?: boolean;
  abcErrors: string[];
  abcWarnings: string[];
};

export default function TopBar({
  title,
  onTitleChange,
  onNew,
  onOpen,
  onSave,
  canSave,
  saveStatus,
  saveMessage,
  playbackStatus,
  onPlay,
  onPause,
  onStop,
  playbackDisabled = false,
  playbackLoading = false,
  abcErrors,
  abcWarnings,
}: TopBarProps) {
  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    onTitleChange(e.target.value);
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap items-center gap-2 w-full">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Titre de la composition"
          aria-label="Titre de la composition"
          className="flex-1 min-w-[10rem] px-3 py-2 rounded font-semibold text-black"
        />

        <div className="flex gap-1">
          <button type="button" className="px-3 py-2 rounded text-sm" onClick={onNew}>
            Nouvelle
          </button>
          <button type="button" className="px-3 py-2 rounded text-sm" onClick={onOpen}>
            Ouvrir
          </button>
          <button
            type="button"
            className="text-sm primary px-3 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onSave}
            disabled={!canSave || saveStatus === "saving"}
            title={canSave ? "Sauvegarder" : "Connexion requise pour sauvegarder"}
          >
            {saveStatus === "saving" ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>

      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm min-h-[1.5rem]">
        {saveStatus === "saved" && <span className="text-green-400">✓ {saveMessage || "Sauvegardé"}</span>}
        {saveStatus === "error" && <span className="text-red-400">⚠ {saveMessage || "Erreur de sauvegarde"}</span>}
        {!canSave && saveStatus === "idle" && (
          <span className="opacity-70">Connexion requise pour sauvegarder</span>
        )}
      </div>

      {(abcErrors.length > 0 || abcWarnings.length > 0) && (
        <div className="flex flex-col gap-1 text-sm">
          {abcErrors.map((err, i) => (
            <div key={`err-${i}`} className="px-3 py-1 rounded bg-red-100 text-red-700">
              ⚠ {err}
            </div>
          ))}
          {abcWarnings.map((warn, i) => (
            <div key={`warn-${i}`} className="px-3 py-1 rounded bg-yellow-100 text-yellow-800">
              ⓘ {warn}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
