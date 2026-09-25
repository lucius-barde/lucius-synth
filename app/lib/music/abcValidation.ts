/**
 * Validation ABC "métier", à exécuter avant toute conversion d'une chaîne
 * ABC vers le modèle interne (chargement depuis la base de données,
 * prévisualisation, etc.).
 *
 * Cette validation complète le parsing effectué par abcjs (voir
 * abcParsing.ts) : elle combine
 *   1) le parsing/la conversion via abcToMusicDocument() (qui détecte déjà
 *      les erreurs de syntaxe ABC, le titre manquant, la mesure non
 *      supportée et le nombre de pistes excessif) ;
 *   2) validateMusicDocument() (constraints.ts) appliqué au document
 *      obtenu, pour vérifier la plage de hauteurs, les durées et le tempo.
 *
 * En cas d'erreur bloquante, aucune conversion "partielle" n'est retournée :
 * seul le statut valid/errors/warnings est exploitable, jamais un document.
 * Le document validé (si valid === true) doit être obtenu séparément via un
 * nouvel appel à abcToMusicDocument().
 */
import { abcToMusicDocument } from "./abcParsing";
import { validateMusicDocument } from "./constraints";
import type { AbcValidationResult } from "./types";

/** Catégories de problème pouvant être signalées, utiles pour l'affichage ciblé côté UI. */
export type AbcValidationIssueCategory =
  | "syntax"
  | "missing-field"
  | "unsupported-meter"
  | "too-many-tracks"
  | "pitch-out-of-range"
  | "unsupported-duration"
  | "invalid-tempo"
  | "other";

export type AbcValidationIssue = {
  category: AbcValidationIssueCategory;
  message: string;
};

export type AbcValidationDetailedResult = AbcValidationResult & {
  /** Version catégorisée des erreurs, pour un affichage UI plus précis que de simples chaînes. */
  issues: AbcValidationIssue[];
};

function categorizeMessage(message: string): AbcValidationIssueCategory {
  const lower = message.toLowerCase();
  if (lower.includes("erreur de syntaxe abc") || lower.includes("n'a pas pu être interprété")) {
    return "syntax";
  }
  if (lower.includes("champ obligatoire manquant")) {
    return "missing-field";
  }
  if (lower.includes("mesure non supportée") || lower.includes("déterminer la mesure")) {
    return "unsupported-meter";
  }
  if (lower.includes("pistes, alors que") || lower.includes("aucune piste")) {
    return "too-many-tracks";
  }
  if (lower.includes("hors de la plage autorisée")) {
    return "pitch-out-of-range";
  }
  if (lower.includes("double-croche") || lower.includes("durée")) {
    return "unsupported-duration";
  }
  if (lower.includes("tempo")) {
    return "invalid-tempo";
  }
  return "other";
}

function toIssues(messages: string[]): AbcValidationIssue[] {
  return messages.map((message) => ({ category: categorizeMessage(message), message }));
}

/**
 * Valide une chaîne ABC par rapport aux règles métier de l'application.
 *
 * Ne retourne jamais de document : uniquement le statut de validation. Pour
 * obtenir le MusicDocument correspondant après une validation réussie,
 * utiliser abcToMusicDocument(abc) séparément (le document sera alors
 * garanti conforme).
 */
export function validateAbcNotation(abc: string): AbcValidationResult {
  return validateAbcNotationDetailed(abc);
}

/** Variante détaillée, avec catégorisation des erreurs (utile pour l'UI). */
export function validateAbcNotationDetailed(abc: string): AbcValidationDetailedResult {
  const { document, errors, warnings } = abcToMusicDocument(abc);

  if (!document) {
    return {
      valid: false,
      errors,
      warnings,
      issues: toIssues(errors),
    };
  }

  const businessValidation = validateMusicDocument(document);

  const allErrors = [...errors, ...businessValidation.errors];

  return {
    valid: businessValidation.valid && errors.length === 0,
    errors: allErrors,
    warnings,
    issues: toIssues(allErrors),
  };
}
