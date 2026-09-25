"use client";

/**
 * Grille d'édition musicale (piano roll) pour la piste active.
 *
 * - Axe horizontal : temps, subdivisé à la double-croche (steps). Les traits
 *   de mesure et de temps fort sont mis en évidence visuellement.
 * - Axe vertical : hauteurs disponibles (MIN_MIDI_NOTE à MAX_MIDI_NOTE), grave
 *   en bas / aigu en haut, comme un piano roll classique.
 * - Chaque piste a sa couleur (voir getTrackColor()) ; seule la piste active
 *   est éditable ici, mais les autres pistes sont affichées en superposition
 *   discrète pour donner un contexte visuel (pas de props droit d'édition).
 *
 * Interactions pensées mobile-first :
 * - Tap sur une cellule vide -> crée une note (durée = 1 step par défaut).
 * - Tap sur une note -> la sélectionne (affiche les contrôles d'édition
 *   fournis par le parent : hauteur/durée/suppression). Pas de dépendance au
 *   clic droit.
 * - Une fois sélectionnée, une note peut être déplacée avec les boutons
 *   fléchés fournis par le panneau d'édition (voir NoteEditorPanel), plutôt
 *   que du drag-and-drop tactile complexe à fiabiliser sur toutes plateformes.
 */
import { useEffect, useMemo, useRef } from "react";
import { STEPS_PER_BEAT, getStepsPerMeasure, type Meter } from "../../lib/music/constants";
import { getAvailableMidiRange, midiToLabel } from "../../lib/music/pitch";
import { getTrackColor } from "../../lib/music/factory";
import type { MusicNote, MusicTrack } from "../../lib/music/types";

const CELL_WIDTH = 28;
const CELL_HEIGHT = 22;
const CELL_BORDER = "1px solid rgba(255,255,255,0.12)";
const MEASURE_BORDER = "1px solid rgba(255,255,255,0.45)";
const GRID_MIN_MIDI = 24; // C1
const GRID_MAX_MIDI = 84; // C6

type MusicGridProps = {
  tracks: MusicTrack[];
  activeTrackId: string;
  meter: Meter;
  measureCount: number;
  selectedNoteId?: string | null;
  onCreateNote: (midi: number, startStep: number) => void;
  onSelectNote: (noteId: string) => void;
  onPitchChange: (midi: number) => void;
  onMove: (deltaSteps: number) => void;
  onResize: (deltaSteps: number) => void;
  onDelete: () => void;
  onDeselect: () => void;
};

export default function MusicGrid({
  tracks,
  activeTrackId,
  meter,
  measureCount,
  selectedNoteId,
  onCreateNote,
  onSelectNote,
  onPitchChange,
  onMove,
  onResize,
  onDelete,
  onDeselect,
}: MusicGridProps) {
  const stepsPerMeasure = getStepsPerMeasure(meter);
  const totalSteps = stepsPerMeasure * measureCount;
  const stepsPerBeat = STEPS_PER_BEAT[meter];

  const midiRange = useMemo(() => getAvailableMidiRange(), []);
  // Grave en bas -> on inverse l'ordre d'affichage.
  const pitchRows = useMemo(
    () => [...midiRange].filter((midi) => midi >= GRID_MIN_MIDI && midi <= GRID_MAX_MIDI).reverse(),
    [midiRange]
  );

  const activeTrackIndex = tracks.findIndex((t) => t.id === activeTrackId);
  const activeTrack = tracks[activeTrackIndex];

  const gridWidth = totalSteps * CELL_WIDTH;
  const gridScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridScrollRef.current;
    if (!grid) return;
    grid.scrollTop = (grid.scrollHeight - grid.clientHeight) / 2;
  }, []);

  function isMeasureStart(step: number): boolean {
    return step % stepsPerMeasure === 0;
  }
  function isBeatStart(step: number): boolean {
    return step % stepsPerBeat === 0;
  }

  function noteAt(track: MusicTrack, midi: number, step: number): MusicNote | undefined {
    return track.notes.find((n) => n.midi === midi && step >= n.startStep && step < n.startStep + n.durationSteps);
  }

  function handleCellClick(midi: number, step: number) {
    if (!activeTrack) return;
    const existing = activeTrack.notes.find((n) => step >= n.startStep && step < n.startStep + n.durationSteps);
    if (existing) {
      if (existing.midi === midi) {
        onSelectNote(existing.id);
      }
      return;
    }
    onCreateNote(midi, step);
  }

  return (
    <div ref={gridScrollRef} className="w-full max-h-[575px] overflow-auto border border-white/20 rounded pt-[18px]" role="grid" aria-label="Grille musicale">
      <div style={{ display: "flex", minWidth: gridWidth + 80 }}>
        {/* Colonne des noms de hauteur, fixe au scroll horizontal */}
        <div style={{ position: "sticky", left: 0, zIndex: 2, background: "var(--background)" }}>
          <div
            style={{ height: CELL_HEIGHT, width: 56 }}
            data-alteration="0"
            className="bg-white"
          />
          {pitchRows.map((midi) => (
            <div
              key={midi}
              style={{ height: CELL_HEIGHT, width: 56, border: "1px solid var(--color-blue-100)" }}
              data-alteration={midiToLabel(midi).includes("#") ? "1" : "0"}
              className={`flex items-center justify-end pr-2 text-xs ${
                selectedNoteId && activeTrack?.notes.some((note) => note.id === selectedNoteId && note.midi === midi)
                  ? "bg-[var(--color-blue-500)] text-white"
                  : midiToLabel(midi).includes("#")
                    ? "bg-[#324661] text-white"
                    : "bg-white text-black"
              }`}
            >
              {midiToLabel(midi)}
            </div>
          ))}
        </div>

        <div style={{ position: "relative", width: gridWidth }}>
          {/* En-tête des mesures/temps */}
          <div style={{ display: "flex", height: CELL_HEIGHT }}>
            {Array.from({ length: totalSteps }, (_, step) => (
              <div
                key={step}
                style={{
                  width: CELL_WIDTH,
                  border: CELL_BORDER,
                  borderLeft: isMeasureStart(step) ? MEASURE_BORDER : CELL_BORDER,
                }}
                className={`text-[10px] flex items-center justify-center ${
                  isMeasureStart(step) ? "font-bold" : ""
                }`}
              >
                {isMeasureStart(step) ? Math.floor(step / stepsPerMeasure) + 1 : ""}
              </div>
            ))}
          </div>

          {/* Lignes de hauteur */}
          {pitchRows.map((midi) => (
            <div key={midi} style={{ display: "flex", height: CELL_HEIGHT }}>
              {Array.from({ length: totalSteps }, (_, step) => {
                const cellNotes = tracks.map((t) => ({ track: t, note: noteAt(t, midi, step) }));
                const activeHit = activeTrack ? noteAt(activeTrack, midi, step) : undefined;
                const otherHits = cellNotes.filter((c) => c.note && c.track.id !== activeTrackId);

                const isNoteStartActive = activeHit && activeHit.startStep === step;
                const isSelected = activeHit && activeHit.id === selectedNoteId;
                const isSelectedStart = isSelected && activeHit.startStep === step;

                const backgroundColor = activeHit
                  ? getTrackColor(activeTrackIndex)
                  : otherHits.length > 0
                    ? `${getTrackColor(tracks.indexOf(otherHits[0].track))}55`
                    : isBeatStart(step)
                      ? "rgba(255,255,255,0.035)"
                      : undefined;

                return (
                  <div key={step} style={{ position: "relative", width: CELL_WIDTH, height: CELL_HEIGHT }}>
                  <button
                    type="button"
                    onClick={() => handleCellClick(midi, step)}
                    aria-label={`${midiToLabel(midi)} - step ${step}`}
                    style={{
                      width: CELL_WIDTH,
                      height: CELL_HEIGHT,
                      backgroundColor,
                      border: CELL_BORDER,
                      borderLeft: isMeasureStart(step) ? MEASURE_BORDER : CELL_BORDER,
                      opacity: activeHit ? (isNoteStartActive ? 1 : 0.6) : 1,
                      outline: isSelectedStart ? "2px solid var(--foreground, #252B33)" : undefined,

                    }}
                    className={`p-0 ${isBeatStart(step) ? "hover:bg-white/30" : "hover:bg-white/20"}`}
                  />
                  {isSelectedStart && activeHit && (
                    <div
                      className={`absolute bottom-[120%] z-20 flex gap-1 p-1 rounded text-white shadow-lg ${
                        activeHit.startStep <= 1
                          ? "left-0"
                          : activeHit.startStep + activeHit.durationSteps >= totalSteps - 4
                            ? "right-0"
                            : "left-1/2 -translate-x-1/2"
                      }`}
                      style={{ backgroundColor: getTrackColor(activeTrackIndex) }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {[
                        ["▼", () => onPitchChange(activeHit.midi - 1), activeHit.midi <= midiRange[0]],
                        ["▲", () => onPitchChange(activeHit.midi + 1), activeHit.midi >= midiRange[midiRange.length - 1]],
                        ["◀", () => onMove(-1), activeHit.startStep <= 0],
                        ["▶", () => onMove(1), activeHit.startStep + activeHit.durationSteps >= totalSteps],
                        ["-", () => onResize(-1), activeHit.durationSteps <= 1],
                        ["+", () => onResize(1), activeHit.startStep + activeHit.durationSteps >= totalSteps],
                        ["_", onDeselect, false],
                        ["×", onDelete, false],
                      ].map(([label, action, disabled], index) => (
                        <button
                          key={String(label)}
                          type="button"
                          onClick={action as () => void}
                          disabled={Boolean(disabled)}
                          className={`w-7 h-7 px-2 py-1 rounded text-sm disabled:opacity-40 ${index === 7 ? "!bg-[var(--color-red-500)] !text-white" : ""}`}
                          aria-label={String(label)}
                        >
                          {String(label)}
                        </button>
                      ))}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
