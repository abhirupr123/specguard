import type { EvidenceChunk } from "./types";

type Embedder = (texts:string[]) => Promise<number[][]>;

const STOP_WORDS = new Set(["a","an","and","are","as","at","be","by","for","from","has","have","how","i","in","is","it","of","on","or","that","the","this","to","was","what","when","which","why","will","with"]);

export function normalizeText(value:string) {
  return value.normalize("NFKC").replace(/Â·/g, "·").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

export function tokenize(value:string) {
  return normalizeText(value).toLowerCase().match(/[a-z0-9]+(?:[+.-][a-z0-9]+)*/g)?.filter(token => token.length > 1 && !STOP_WORDS.has(token)) ?? [];
}

export function keywordScore(query:string, chunk:EvidenceChunk) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return 0;
  const haystack = normalizeText(`${chunk.source} ${chunk.text}`).toLowerCase();
  const documentTokens = tokenize(haystack);
  const frequencies = new Map<string,number>();
  for (const token of documentTokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  let score = 0;
  for (const token of new Set(queryTokens)) {
    const count = frequencies.get(token) ?? 0;
    if (count) score += 1 + Math.log1p(count);
  }
  const exactTags = query.toUpperCase().match(/\b(?:UPS|CRAH|DG)-\d{2}\b/g) ?? [];
  for (const tag of exactTags) if (haystack.includes(tag.toLowerCase())) score += 5;
  const quotedOrTechnical = query.match(/\b(?:IP\d+|N\+1|\d+(?:\.\d+)?\s*(?:kVA|kW|V|weeks?))\b/gi) ?? [];
  for (const term of quotedOrTechnical) if (haystack.includes(term.toLowerCase())) score += 3;
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (normalizedQuery.length >= 8 && haystack.includes(normalizedQuery)) score += 4;
  if (chunk.origin !== "seeded") score += 0.35;
  return score / Math.max(1, Math.sqrt(queryTokens.length));
}

export function cosineSimilarity(left:number[], right:number[]) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0; let leftLength = 0; let rightLength = 0;
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index]; leftLength += left[index] ** 2; rightLength += right[index] ** 2;
  }
  return leftLength && rightLength ? dot / (Math.sqrt(leftLength) * Math.sqrt(rightLength)) : 0;
}

export function deduplicateChunks(chunks:EvidenceChunk[]) {
  const seen = new Set<string>();
  return chunks.filter(chunk => {
    const key = `${normalizeText(chunk.source).toLowerCase()}|${chunk.page}|${normalizeText(chunk.text).toLowerCase()}`;
    if (!chunk.text.trim() || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export async function rankEvidence(query:string, chunks:EvidenceChunk[], embedder?:Embedder, limit=8) {
  const unique = deduplicateChunks(chunks);
  const keywordScores = unique.map(chunk => keywordScore(query, chunk));
  let semanticScores = unique.map(() => 0);
  let semanticAvailable = false;
  if (embedder && unique.length) {
    try {
      const vectors = await embedder([query, ...unique.map(chunk => `${chunk.source}\n${chunk.text}`)]);
      if (vectors.length === unique.length + 1) {
        semanticScores = unique.map((_, index) => cosineSimilarity(vectors[0], vectors[index + 1]));
        semanticAvailable = semanticScores.some(score => Number.isFinite(score) && score !== 0);
      }
    } catch { /* Keyword retrieval remains available when embeddings fail. */ }
  }
  const maxKeyword = Math.max(...keywordScores, 1);
  const ranked = unique.map((chunk,index) => ({
    chunk,
    score: semanticAvailable ? (Math.max(0, semanticScores[index]) * 0.7) + ((keywordScores[index] / maxKeyword) * 0.3) : keywordScores[index],
  })).sort((a,b) => b.score - a.score);
  const selected:EvidenceChunk[] = []; const perSource = new Map<string,number>();
  for (const item of ranked) {
    const sourceKey = normalizeText(item.chunk.source).toLowerCase();
    if ((perSource.get(sourceKey) ?? 0) >= 3) continue;
    selected.push(item.chunk); perSource.set(sourceKey, (perSource.get(sourceKey) ?? 0) + 1);
    if (selected.length >= limit) break;
  }
  return selected;
}
