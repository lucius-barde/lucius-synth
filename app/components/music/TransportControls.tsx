"use client";

/**
 * Contrôles musicaux globaux : tempo et mesure.
 * Le tempo est validé (bornes MIN_TEMPO/MAX_TEMPO) avant d'être appliqué.
 */
import { useId, type ChangeEvent } from "react";
import {
  MAX_TEMPO,
  MIN_TEMPO,
  NOTE_DURATIONS,
  SUPPORTED_METERS,
  type Meter,
  type NoteDuration,
} from "../../lib/music/constants";

type TransportControlsProps = {
  tempo: number;
  onTempoChange: (tempo: number) => void;
  meter: Meter;
  onMeterChange: (meter: Meter) => void;
  noteDuration: NoteDuration;
  onNoteDurationChange: (duration: NoteDuration) => void;
  disabled?: boolean;
};

export default function TransportControls({
  tempo,
  onTempoChange,
  meter,
  onMeterChange,
  noteDuration,
  onNoteDurationChange,
  disabled = false,
}: TransportControlsProps) {
  const tempoId = useId();
  const meterId = useId();
  const noteDurationId = useId();

  function handleTempoInput(e: ChangeEvent<HTMLInputElement>) {
    const raw = Number(e.target.value);
    if (Number.isNaN(raw)) return;
    const clamped = Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, raw));
    onTempoChange(clamped);
  }

  return (
    <details className="group" open>
      <summary className="cursor-pointer font-semibold">Rythme</summary>
      <div className="flex flex-wrap items-end gap-4 mt-2 md:mt-0">
      <div className="flex flex-col gap-1">
        <label htmlFor={tempoId} className="text-sm font-semibold">
          Tempo ({MIN_TEMPO}-{MAX_TEMPO} BPM)
        </label>
        <div className="flex items-center gap-2">
          <input
            id={tempoId}
            type="range"
            min={MIN_TEMPO}
            max={MAX_TEMPO}
            value={tempo}
            disabled={disabled}
            onChange={handleTempoInput}
            className="w-[240px]"
          />
          <input
            type="number"
            min={MIN_TEMPO}
            max={MAX_TEMPO}
            value={tempo}
            disabled={disabled}
            onChange={handleTempoInput}
            className="w-16 px-2 py-1 rounded text-black"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={meterId} className="text-sm font-semibold">
          Mesure
        </label>
        <select
          id={meterId}
          value={meter}
          disabled={disabled}
          onChange={(e) => onMeterChange(e.target.value as Meter)}
          className="px-2 py-2 rounded text-black"
        >
          {SUPPORTED_METERS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={noteDurationId} className="text-sm font-semibold">
          Durée note
        </label>
        <select
          id={noteDurationId}
          value={noteDuration}
          disabled={disabled}
          onChange={(e) => onNoteDurationChange(e.target.value as NoteDuration)}
          className="px-2 py-2 rounded text-black"
        >
          {NOTE_DURATIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value}
            </option>
          ))}
        </select>
      </div>
      </div>
    </details>
  );
}
