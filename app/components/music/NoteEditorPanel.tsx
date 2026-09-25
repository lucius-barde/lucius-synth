"use client";

/**
 * Panneau d'édition de la note actuellement sélectionnée.
 *
 * Fournit toutes les actions nécessaires sans dépendre du clic droit ni du
 * drag-and-drop, afin de rester pleinement utilisable au doigt sur mobile :
 * - changer la hauteur (via PitchSelector, étape 4) ;
 * - déplacer la note dans le temps (boutons ◀ ▶, résolution = 1 step) ;
 * - modifier sa durée (boutons -/+, résolution = 1 step = 1 double-croche) ;
 * - la supprimer (bouton dédié).
 */
import PitchSelector from "./PitchSelector";
import type { MusicNote } from "../../lib/music/types";

type NoteEditorPanelProps = {
  note: MusicNote | null;
  totalSteps: number;
  onPitchChange: (midi: number) => void;
  onMove: (deltaSteps: number) => void;
  onResize: (deltaSteps: number) => void;
  onDelete: () => void;
};

export default function NoteEditorPanel({
  note,
  totalSteps,
  onPitchChange,
  onMove,
  onResize,
  onDelete,
}: NoteEditorPanelProps) {
  if (!note) {
    return (
      <div className="p-3 rounded border border-white/10 text-sm opacity-70">
        Sélectionnez une note dans la grille pour l&apos;éditer, ou touchez une cellule vide pour en créer une.
      </div>
    );
  }

  const canMoveLeft = note.startStep > 0;
  const canMoveRight = note.startStep + note.durationSteps < totalSteps;
  const canShrink = note.durationSteps > 1;
  const canGrow = note.startStep + note.durationSteps < totalSteps;

  return (
    <div className="p-3 rounded border border-white/10 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Note sélectionnée</span>
        <button
          type="button"
          onClick={onDelete}
          className="px-3 py-1.5 rounded bg-red-600 text-white text-sm"
          aria-label="Supprimer la note"
        >
          Supprimer
        </button>
      </div>

      <PitchSelector value={note.midi} onChange={onPitchChange} label="Hauteur" />

      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Position (step {note.startStep})</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canMoveLeft}
            className="px-3 py-2 rounded disabled:opacity-40"
            aria-label="Déplacer vers la gauche"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canMoveRight}
            className="px-3 py-2 rounded disabled:opacity-40"
            aria-label="Déplacer vers la droite"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Durée ({note.durationSteps} × double-croche)</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onResize(-1)}
            disabled={!canShrink}
            className="px-3 py-2 rounded disabled:opacity-40"
            aria-label="Réduire la durée"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onResize(1)}
            disabled={!canGrow}
            className="px-3 py-2 rounded disabled:opacity-40"
            aria-label="Augmenter la durée"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
