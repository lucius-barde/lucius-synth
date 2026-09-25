"use client";

/**
 * Modale "Ouvrir" : liste les compositions musicdocument appartenant à
 * l'utilisateur connecté (récupérées via GET /api/musicdocument/getAllMusicDocuments)
 * et permet d'en sélectionner une pour la charger dans l'éditeur.
 *
 * Purement présentationnel : la logique de récupération/chargement est
 * fournie par le composant parent (DawEditor) via des props.
 */
import type { Meter } from "../../lib/music/constants";

export type MusicDocumentSummary = {
  id: string;
  url: string;
  name: string;
  tempo: number;
  meter: Meter;
  user_id: string | null;
  created: number;
  edited: number;
};

type OpenDocumentDialogProps = {
  open: boolean;
  onClose: () => void;
  documents: MusicDocumentSummary[];
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  selectingId: string | null;
};

function formatDate(timestampMs: number): string {
  try {
    return new Date(timestampMs).toLocaleString();
  } catch {
    return "";
  }
}

export default function OpenDocumentDialog({
  open,
  onClose,
  documents,
  loading,
  error,
  onSelect,
  selectingId,
}: OpenDocumentDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Ouvrir une composition"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 text-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold">Ouvrir une composition</h2>
          <button
            type="button"
            className="px-2 py-1 rounded hover:bg-white/10"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="opacity-80">Chargement des compositions…</p>}

          {!loading && error && (
            <p className="px-3 py-2 rounded bg-red-100 text-red-700">⚠ {error}</p>
          )}

          {!loading && !error && documents.length === 0 && (
            <p className="opacity-80">Aucune composition sauvegardée pour le moment.</p>
          )}

          {!loading && !error && documents.length > 0 && (
            <ul className="flex flex-col gap-2">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded border border-white/10 hover:bg-white/10 disabled:opacity-50 flex flex-col gap-0.5"
                    onClick={() => onSelect(doc.id)}
                    disabled={selectingId !== null}
                  >
                    <span className="font-medium">
                      {doc.name} {selectingId === doc.id && "(chargement…)"}
                    </span>
                    <span className="text-xs opacity-70">
                      {doc.meter} · {doc.tempo} BPM · modifié le {formatDate(doc.edited)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
