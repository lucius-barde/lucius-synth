"use client";

/**
 * Barre de contrôle des pistes : sélection de la piste active, instrument,
 * mute et solo. Une couleur distincte identifie chaque piste (cohérente
 * avec la grille d'édition, voir getTrackColor()).
 */
import { AVAILABLE_INSTRUMENTS, type InstrumentId } from "../../lib/music/constants";
import { getTrackColor } from "../../lib/music/factory";
import type { MusicTrack } from "../../lib/music/types";

type TrackControlsProps = {
  tracks: MusicTrack[];
  activeTrackId: string;
  onSelectTrack: (trackId: string) => void;
  onInstrumentChange: (trackId: string, instrument: InstrumentId) => void;
  onNameChange: (trackId: string, name: string) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
};

export default function TrackControls({
  tracks,
  activeTrackId,
  onSelectTrack,
  onInstrumentChange,
  onNameChange,
  onToggleMute,
  onToggleSolo,
}: TrackControlsProps) {
  return (
    <details className="group" open>
      <summary className="cursor-pointer font-semibold">Pistes</summary>
      <div className="flex flex-row gap-2 w-full overflow-y-auto mt-2 md:mt-0">
      {tracks.map((track, index) => {
        const isActive = track.id === activeTrackId;
        const color = getTrackColor(index);
        return (
          <div
            key={track.id}
            className="flex flex-wrap items-center gap-2 p-2 rounded"
            style={{
              borderLeft: `4px solid ${color}`,
              backgroundColor: isActive ? "rgba(255,255,255,0.08)" : "transparent",
            }}
          >
            <button
              type="button"
              onClick={() => onSelectTrack(track.id)}
              className="px-2 py-1 rounded text-sm font-semibold min-w-[6rem] text-left"
              aria-pressed={isActive}
              style={{ color }}
              title="Sélectionner cette piste comme piste active"
            >
              {isActive ? "● " : "○ "}
              {track.name}
            </button>

            <input
              type="text"
              value={track.name}
              onChange={(e) => onNameChange(track.id, e.target.value)}
              aria-label={`Nom de la piste ${index + 1}`}
              className="px-2 py-1 rounded text-sm text-black w-28"
            />

            <select
              value={track.instrument}
              onChange={(e) => onInstrumentChange(track.id, e.target.value as InstrumentId)}
              aria-label={`Instrument de la piste ${index + 1}`}
              className="px-2 py-1 rounded text-sm text-black"
            >
              {AVAILABLE_INSTRUMENTS.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onToggleMute(track.id)}
              aria-pressed={!!track.muted}
              className="px-2 py-1 rounded text-sm"
              style={track.muted ? { backgroundColor: "#dc2626", color: "#fff" } : undefined}
              title="Muet"
            >
              M
            </button>

            <button
              type="button"
              onClick={() => onToggleSolo(track.id)}
              aria-pressed={!!track.solo}
              className="px-2 py-1 rounded text-sm"
              style={track.solo ? { backgroundColor: "#facc15", color: "#000" } : undefined}
              title="Solo"
            >
              S
            </button>
          </div>
        );
      })}
      </div>
    </details>
  );
}
