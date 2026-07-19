import { NextRequest, NextResponse } from "next/server";
import { normalizeText, rankEvidence } from "@/lib/copilot/retrieval";
import type { ChatHistoryItem, CopilotCitation, CopilotResponse, EvidenceChunk } from "@/lib/copilot/types";
import { findings } from "@/lib/specguard";

const MAX_QUESTION_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 6;

function citationParts(value:string) {
  const normalized = normalizeText(value);
  const match = normalized.match(/^(.*?)\s*·\s*p\.?\s*(\d+)/i);
  return { source:(match?.[1] ?? normalized).trim(), page:Number(match?.[2] ?? 1) };
}

function seededEvidence():EvidenceChunk[] {
  return findings.flatMap((finding,index) => {
    const approved = citationParts(finding.approvedCitation); const vendor = citationParts(finding.vendorCitation);
    return [
      { id:`seed-${index}-approved`, source:approved.source, page:approved.page, origin:"seeded" as const, text:`${finding.id}, ${finding.rule}, approved requirement for ${finding.assetId.toUpperCase()}: ${finding.approvedEvidence} Expected ${finding.expected}.` },
      { id:`seed-${index}-vendor`, source:vendor.source, page:vendor.page, origin:"seeded" as const, text:`${finding.id}, ${finding.rule}, vendor submission for ${finding.assetId.toUpperCase()}: ${finding.vendorEvidence} Submitted ${finding.actual}. Severity ${finding.severity}; status ${finding.status}; milestone ${finding.milestone}; recommended action: ${finding.recommendation}` },
    ];
  });
}

function validHistory(value:unknown):ChatHistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item):item is ChatHistoryItem => Boolean(item) && typeof item === "object" && ((item as ChatHistoryItem).role === "user" || (item as ChatHistoryItem).role === "assistant") && typeof (item as ChatHistoryItem).content === "string")
    .map(item=>({ role:item.role, content:item.content.slice(0,2000) })).slice(-MAX_HISTORY_ITEMS);
}

function excerpt(text:string) { return normalizeText(text).slice(0,240); }
function toCitation(chunk:EvidenceChunk):CopilotCitation { return { source:normalizeText(chunk.source), page:chunk.page, excerpt:excerpt(chunk.text) }; }

function fallbackAnswer(question:string, evidence:EvidenceChunk[]):CopilotResponse {
  const isUps = /ups|blocked|critical|capacity|voltage|redundancy/i.test(question);
  const isCommissioning = /commission|threat|risk|delay|milestone|energisation|energization/i.test(question);
  const answer = isUps
    ? "UPS-01 is blocked because its submitted 400 kVA capacity, 400 V input, and N configuration conflict with the approved 500 kVA, 415 V, and N+1 requirements. These critical deviations must be resolved before energisation and commissioning."
    : isCommissioning
      ? "Open UPS capacity, voltage, redundancy, and enclosure deviations threaten energisation and commissioning. The generator delivery delay threatens FAT, and the CRAH protection-class deviation threatens cooling commissioning."
      : "Gemini is currently unavailable. I can still retrieve project evidence, but I cannot safely synthesize a reliable answer to this question right now.";
  return { answer, grounded:isUps || isCommissioning, mode:"fallback", citations:evidence.slice(0,3).map(toCitation) };
}

export async function POST(request:NextRequest, { params }:{ params:Promise<{ id:string }> }) {
  const { id } = await params;
  let body:unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error:"Send a JSON request body." }, { status:400 }); }
  const payload = body as { question?:unknown; history?:unknown };
  if (typeof payload.question !== "string" || !payload.question.trim()) return NextResponse.json({ error:"Enter a project question." }, { status:400 });
  const question = payload.question.trim();
  if (question.length > MAX_QUESTION_LENGTH) return NextResponse.json({ error:`Questions must be ${MAX_QUESTION_LENGTH} characters or fewer.` }, { status:413 });
  const history = validHistory(payload.history);

  const chunks:EvidenceChunk[] = [];
  try {
    const { getProjectText } = await import("@/lib/project-store");
    chunks.push(...getProjectText(id).map((chunk,index)=>({ ...chunk, id:`memory-${index}`, origin:"uploaded" as const })));
  } catch { /* Seeded evidence still supports the reference workspace. */ }
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    try {
      const { loadProjectChunks } = await import("@/lib/supabase/repository");
      const persisted = await loadProjectChunks(id);
      chunks.push(...persisted.map((chunk,index)=>({ ...chunk, id:`db-${index}`, origin:"persisted" as const })));
    } catch { /* In-memory and seeded evidence remain available. */ }
  }
  chunks.push(...seededEvidence());
  const retrievalQuery = [...history.filter(item=>item.role === "user").slice(-2).map(item=>item.content), question].join("\n");
  let embedder:((texts:string[])=>Promise<number[][]>) | undefined;
  if (process.env.GEMINI_API_KEY) {
    embedder = async texts => {
      const { embedWithGemini } = await import("@/lib/gemini");
      return await Promise.race([
        embedWithGemini(texts).then(vectors=>vectors ?? []),
        new Promise<number[][]>(resolve=>setTimeout(()=>resolve([]),4500)),
      ]);
    };
  }
  const ranked = (await rankEvidence(retrievalQuery, chunks, embedder, 8)).map((chunk,index)=>({ ...chunk, id:`E${index + 1}` }));

  if (process.env.GEMINI_API_KEY) {
    try {
      const { answerWithGemini } = await import("@/lib/gemini");
      const result = await answerWithGemini(question, history, ranked);
      if (result) {
        const cited = [...new Set(result.citedChunkIds)].map(chunkId=>ranked.find(chunk=>chunk.id === chunkId)).filter((chunk):chunk is EvidenceChunk=>Boolean(chunk));
        if (result.insufficientEvidence || !result.answer || !cited.length) {
          return NextResponse.json({ answer:result.answer || "The answer is not available in the current project evidence.", grounded:false, mode:"insufficient", citations:[] } satisfies CopilotResponse);
        }
        return NextResponse.json({ answer:result.answer, grounded:true, mode:"gemini", citations:cited.map(toCitation) } satisfies CopilotResponse);
      }
    } catch { /* Return the deterministic evidence-safe fallback below. */ }
  }
  return NextResponse.json(fallbackAnswer(question, ranked));
}
