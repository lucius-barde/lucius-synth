"use client";

/**
 * Sélecteur de hauteur (pitch) réutilisable pour le mini-DAW.
 *
 * - Affiche uniquement les hauteurs disponibles dans la plage configurée
 *   (voir MIN_MIDI_NOTE / MAX_MIDI_NOTE dans app/lib/music/constants.ts).
 * - Empêche toute sélection hors limites (le <select> ne contient que les
 *   options valides, et les boutons +/- demi-ton se désactivent en butée).
 * - Affiche le nom de la note de façon lisible (ex: "A#3"), convention dièses.
 * - Pensé pour être utilisable au doigt sur mobile (boutons larges, pas de
 *   dépendance au clic droit ou au survol).
 */
import { useId } from "react";
import { MAX_MIDI_NOTE, MIN_MIDI_NOTE } from "../../lib/music/constants";
import { getAvailablePitches, midiToLabel, shiftMidiWithinRange, type PitchInfo } from "../../lib/music/pitch";

type PitchSelectorProps = {
  /** Numéro MIDI actuellement sélectionné. */
  value: number;
  /** Appelé avec le nouveau numéro MIDI (déjà garanti dans la plage autorisée). */
  onChange: (midi: number) => void;
  /** Étiquette affichée au-dessus du sélecteur. */
  label?: string;
  /** Plage min/max à utiliser si différente de la plage globale par défaut. */
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
};

export default function PitchSelector({
  value,
  onChange,
  label = "Hauteur",
  min = MIN_MIDI_NOTE,
  max = MAX_MIDI_NOTE,
  disabled = false,
  className = "",
}: PitchSelectorProps) {
  const selectId = useId();
  const pitches = getAvailablePitches(min, max);

  function handleShift(semitones: number) {
    const next = shiftMidiWithinRange(value, semitones, min, max);
    if (next !== null) {
      onChange(next);
    }
  }

  const canGoDown = shiftMidiWithinRange(value, -1, min, max) !== null;
  const canGoUp = shiftMidiWithinRange(value, 1, min, max) !== null;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold">
          {label}
        </label>
      )}
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          aria-label="Descendre d'un demi-ton"
          onClick={() => handleShift(-1)}
          disabled={disabled || !canGoDown}
          className="px-3 py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ▼
        </button>
        <select
          id={selectId}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 min-w-[5rem] px-2 py-2 rounded text-black"
        >
          {pitches.map((pitch: PitchInfo) => (
            <option key={pitch.midi} value={pitch.midi}>
              {pitch.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Monter d'un demi-ton"
          onClick={() => handleShift(1)}
          disabled={disabled || !canGoUp}
          className="px-3 py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ▲
        </button>
      </div>
      <span className="text-xs opacity-70">Note actuelle : {midiToLabel(value)}</span>
    </div>
  );
}
