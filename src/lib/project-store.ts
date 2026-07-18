import type { ExtractedAsset, ParsedDocument } from "./documents/parser";

export type StoredDocument = { id:string; title:string; mimeType:string; parsed:ParsedDocument; extractedAssets:ExtractedAsset[]; uploadedAt:string };
const projects = new Map<string, StoredDocument[]>();

export function saveDocument(projectId:string, document:StoredDocument) { const current = projects.get(projectId) ?? []; projects.set(projectId, [...current, document]); return document; }
export function getDocuments(projectId:string) { return projects.get(projectId) ?? []; }
export function getProjectText(projectId:string) { return getDocuments(projectId).flatMap(doc=>doc.parsed.chunks.map(chunk=>({ ...chunk, source:doc.title }))); }
