"use client";

/**
 * Composant racine du mini-DAW (étape 5) : assemble la barre supérieure, les
 * contrôles musicaux, les contrôles de piste, la grille d'édition et le
 * panneau d'édition de note.
 *
 * La lecture audio (étape 10) est branchée via usePlaybackService : les
 * boutons Play/Pause/Stop de la TopBar pilotent le service, et toute
 * modification du document invalide la lecture chargée pour forcer un
 * rechargement à jour au prochain Play.
 *
 * La persistance (étape 11) est branchée via l'API /api/musicdocument :
 * - Sauvegarder : convertit le document en ABC, le valide, puis POST (création)
 *   ou PUT (mise à jour si déjà sauvegardé) selon la présence d'un id.
 * - Ouvrir : affiche une modale listant les compositions de l'utilisateur
 * connecté (GET /api/musicdocument/getAllMusicDocuments), charge l'ABC de
 * la composition choisie (GET /api/musicdocument/[id]), le valide, puis le
 *   convertit vers le modèle interne avant de l'injecter dans l'éditeur.
 * L'authentification est nécessaire pour sauvegarder ; la lecture reste
 * publique côté API mais la modale "Ouvrir" nécessite une session (liste
 * "mes compositions").
 */
import { useCallback, useEffect, useRef, useState } from "react";
import TopBar, { type PlaybackStatus, type SaveStatus } from "./TopBar";
import Header from "../Header";
import TransportControls from "./TransportControls";
import TrackControls from "./TrackControls";
import MusicGrid from "./MusicGrid";
import NoteEditorPanel from "./NoteEditorPanel";
import OpenDocumentDialog, { type MusicDocumentSummary } from "./OpenDocumentDialog";
import { useMusicEditor } from "../../lib/music/useMusicEditor";
import { usePlaybackService } from "../../lib/music/playback/usePlaybackService";
import { musicDocumentToAbc } from "../../lib/music/abcConversion";
import { abcToMusicDocument } from "../../lib/music/abcParsing";
import { validateAbcNotation } from "../../lib/music/abcValidation";
import { computeMeasureCount } from "../../lib/music/documentUtils";
import {
  DEFAULT_NOTE_DURATION,
  getNoteDurationSteps,
  type NoteDuration,
} from "../../lib/music/constants";

type SafeUser = { id: string; [key: string]: unknown };

type DawEditorProps = { documentId?: string };

export default function DawEditor({ documentId }: DawEditorProps) {
  const editor = useMusicEditor();
  const playback = usePlaybackService();

  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState<string | undefined>(undefined);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  const [noteDuration, setNoteDuration] = useState<NoteDuration>(DEFAULT_NOTE_DURATION);

  const [openDialogVisible, setOpenDialogVisible] = useState(false);
  const [documents, setDocuments] = useState<MusicDocumentSummary[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // Vérifie la session au montage, pour savoir si la sauvegarde est autorisée.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
      .then((res) => res.json())
      .then((data: { loggedIn: boolean; user: SafeUser | null }) => {
        if (cancelled) return;
        setCurrentUser(data.loggedIn ? data.user : null);
        setSessionChecked(true);
      })
      .catch(() => {
        if (!cancelled) setSessionChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // La route /musicdocument/[id] demande au DAW de charger le document ciblé.
  useEffect(() => {
    if (documentId === undefined) return;
    void handleSelectDocument(documentId);
    // Le chargement initial ne dépend que de l'identifiant fourni par la route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const playbackStatus: PlaybackStatus =
    playback.state === "playing" ? "playing" : playback.state === "paused" ? "paused" : "stopped";
  const isPlaybackLoading = playback.state === "loading";

  // Toute modification du document invalide la lecture déjà chargée : le
  // prochain Play rechargera la composition à jour plutôt que de jouer une
  // version obsolète.
  const lastDocumentRef = useRef(editor.document);
  useEffect(() => {
    if (lastDocumentRef.current !== editor.document) {
      lastDocumentRef.current = editor.document;
      playback.invalidateLoadedDocument();
      if (playback.state === "playing" || playback.state === "paused") {
        playback.stop();
      }
      // Une nouvelle édition rend l'état de sauvegarde précédent obsolète.
      if (saveStatus !== "idle" && saveStatus !== "saving") {
        setSaveStatus("idle");
        setSaveMessage(undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.document, playback]);

  function handlePlay() {
    void playback.play(editor.document);
  }

  function handlePause() {
    playback.pause();
  }

  function handleStop() {
    playback.stop();
  }

  const handleNew = useCallback(() => {
    editor.resetDocument();
    setSaveStatus("idle");
    setSaveMessage(undefined);
    setLoadErrors([]);
    setLoadWarnings([]);
  }, [editor]);

  const handleSave = useCallback(async () => {
    if (!currentUser) return;

    const measureCount = computeMeasureCount(editor.document);
    const abcNotation = musicDocumentToAbc(editor.document, measureCount);
    const validation = validateAbcNotation(abcNotation);

    if (!validation.valid) {
      setSaveStatus("error");
      setSaveMessage(validation.errors[0] || "Notation ABC invalide, sauvegarde annulée.");
      return;
    }

    setSaveStatus("saving");
    setSaveMessage(undefined);

    try {
      const existingId = editor.document.id;
      const url = existingId ? `/api/musicdocument/${existingId}` : "/api/musicdocument/add";
      const method = existingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editor.document.title,
          abcNotation,
          tempo: editor.document.tempo,
          meter: editor.document.meter,
        }),
      });

      if (res.status === 401) {
        setSaveStatus("error");
        setSaveMessage("Connexion requise pour sauvegarder.");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveStatus("error");
        setSaveMessage(body?.error || "Erreur lors de la sauvegarde.");
        return;
      }

      const saved = (await res.json()) as { id: string };
      editor.setDocumentId(saved.id);
      setSaveStatus("saved");
      setSaveMessage("Composition sauvegardée.");
    } catch (err) {
      setSaveStatus("error");
      setSaveMessage(err instanceof Error ? err.message : "Erreur réseau lors de la sauvegarde.");
    }
  }, [currentUser, editor]);

  const handleOpen = useCallback(() => {
    setOpenDialogVisible(true);
    setDocumentsLoading(true);
    setDocumentsError(null);

    fetch("/api/musicdocument/getAllMusicDocuments")
      .then(async (res) => {
        if (res.status === 401) {
          throw new Error("Connexion requise pour consulter vos compositions.");
        }
        if (!res.ok) {
          throw new Error("Impossible de récupérer la liste des compositions.");
        }
        return res.json();
      })
      .then((rows: MusicDocumentSummary[]) => {
        setDocuments(rows);
        setDocumentsLoading(false);
      })
      .catch((err: Error) => {
        setDocumentsError(err.message);
        setDocumentsLoading(false);
      });
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialogVisible(false);
  }, []);

  const handleSelectDocument = useCallback(
    async (id: string) => {
      setSelectingId(id);
      setLoadErrors([]);
      setLoadWarnings([]);

      try {
        const res = await fetch(`/api/musicdocument/${id}`);
        if (res.status === 404) {
          setLoadErrors(["Composition introuvable (elle a peut-être été supprimée)."]);
          setSelectingId(null);
          return;
        }
        if (!res.ok) {
          setLoadErrors(["Erreur lors du chargement de la composition."]);
          setSelectingId(null);
          return;
        }

        const record = (await res.json()) as { id: string; content: string };

        const validation = validateAbcNotation(record.content);
        if (!validation.valid) {
          setLoadErrors(validation.errors);
          setLoadWarnings(validation.warnings);
          setSelectingId(null);
          return;
        }

        const { document, warnings, errors } = abcToMusicDocument(record.content);
        if (!document) {
          setLoadErrors(errors.length > 0 ? errors : ["Impossible d'interpréter la composition."]);
          setSelectingId(null);
          return;
        }

        document.id = record.id;
        const measureCount = computeMeasureCount(document);
        editor.loadDocument(document, measureCount);

        setLoadWarnings(warnings);
        setSaveStatus("idle");
        setSaveMessage(undefined);
        setOpenDialogVisible(false);
      } catch (err) {
        setLoadErrors([err instanceof Error ? err.message : "Erreur réseau lors du chargement."]);
      } finally {
        setSelectingId(null);
      }
    },
    [editor]
  );

  const selectedNote =
    editor.selection && editor.activeTrack && editor.activeTrack.id === editor.selection.trackId
      ? editor.activeTrack.notes.find((n) => n.id === editor.selection!.noteId) ?? null
      : null;

  function handleCreateNote(midi: number, startStep: number) {
    if (!editor.activeTrack) return;
    editor.addNote(
      editor.activeTrack.id,
      midi,
      startStep,
      getNoteDurationSteps(noteDuration)
    );
  }

  function handleSelectNote(noteId: string) {
    if (!editor.activeTrack) return;
    editor.selectNote(editor.activeTrack.id, noteId);
  }

  function handlePitchChange(midi: number) {
    if (!editor.activeTrack || !selectedNote) return;
    editor.setNotePitch(editor.activeTrack.id, selectedNote.id, midi);
  }

  function handleMove(deltaSteps: number) {
    if (!editor.activeTrack || !selectedNote) return;
    editor.moveNote(editor.activeTrack.id, selectedNote.id, selectedNote.startStep + deltaSteps);
  }

  function handleResize(deltaSteps: number) {
    if (!editor.activeTrack || !selectedNote) return;
    editor.setNoteDuration(editor.activeTrack.id, selectedNote.id, selectedNote.durationSteps + deltaSteps);
  }

  function handleDelete() {
    if (!editor.activeTrack || !selectedNote) return;
    editor.deleteNote(editor.activeTrack.id, selectedNote.id);
  }

  const combinedErrors = [
    ...loadErrors,
    ...(playback.state === "error" ? playback.warnings : []),
  ];
  const combinedWarnings = [
    ...loadWarnings,
    ...(playback.state !== "error" ? playback.warnings : []),
  ];

  return (
    <main
      id="DawEditor"
      className="lucius-site-width-wrapper flex flex-col gap-6 p-4 sm:p-8 flex-1 w-full"
    >
      <TopBar
        title={editor.document.title}
        onTitleChange={editor.setTitle}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        canSave={sessionChecked && !!currentUser}
        saveStatus={saveStatus}
        saveMessage={saveMessage}
        playbackStatus={playbackStatus}
        playbackLoading={isPlaybackLoading}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        abcErrors={combinedErrors}
        abcWarnings={combinedWarnings}
      />

      <TransportControls
        tempo={editor.document.tempo}
        onTempoChange={editor.setTempo}
        meter={editor.document.meter}
        onMeterChange={editor.setMeter}
        noteDuration={noteDuration}
        onNoteDurationChange={setNoteDuration}
      />

      <TrackControls
        tracks={editor.document.tracks}
        activeTrackId={editor.activeTrackId}
        onSelectTrack={editor.setActiveTrack}
        onInstrumentChange={editor.setTrackInstrument}
        onNameChange={editor.setTrackName}
        onToggleMute={editor.toggleTrackMute}
        onToggleSolo={editor.toggleTrackSolo}
      />

      <div className="flex flex-col lg:flex-row gap-4 w-full">
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">

            <button type="button" className="px-3 py-1.5 rounded text-sm" onClick={editor.removeMeasure}>
              −
            </button>
            <span className="text-sm opacity-80">{editor.measureCount} mesure(s)</span>
            <button type="button" className="px-3 py-1.5 rounded text-sm" onClick={editor.addMeasure}>
              +
            </button>
            </div>
            <div className="flex gap-1" role="group" aria-label="Transport">
              <button type="button" className="px-3 py-1.5 rounded disabled:opacity-50" onClick={handlePlay} disabled={isPlaybackLoading || playbackStatus === "playing"}>▶</button>
              <button type="button" className="px-3 py-1.5 rounded disabled:opacity-50" onClick={handlePause} disabled={playbackStatus !== "playing"}>⏸</button>
              <button type="button" className="px-3 py-1.5 rounded disabled:opacity-50" onClick={handleStop} disabled={playbackStatus === "stopped"}>⏹</button>
            </div>
          </div>
          <MusicGrid
            tracks={editor.document.tracks}
            activeTrackId={editor.activeTrackId}
            meter={editor.document.meter}
            measureCount={editor.measureCount}
            selectedNoteId={selectedNote?.id ?? null}
            onCreateNote={handleCreateNote}
            onSelectNote={handleSelectNote}
            onPitchChange={handlePitchChange}
            onMove={handleMove}
            onResize={handleResize}
            onDelete={handleDelete}
            onDeselect={() => editor.clearSelection()}
          />
        </div>

      </div>

      <OpenDocumentDialog
        open={openDialogVisible}
        onClose={handleCloseDialog}
        documents={documents}
        loading={documentsLoading}
        error={documentsError}
        onSelect={handleSelectDocument}
        selectingId={selectingId}
      />
    </main>
  );
}
