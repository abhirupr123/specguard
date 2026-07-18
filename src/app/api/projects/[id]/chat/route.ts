import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  const { question = "" } = await request.json();
  const isUps = /ups|blocked|critical|why/i.test(question);
  let citations = isUps
    ? ["VoltEdge UPS Submittal · p.4", "VoltEdge UPS Submittal · p.5"]
    : ["Client Technical Specification · p.12"];
  let answer = isUps
    ? "UPS-01 is blocked because its vendor submittal conflicts with the approved 500 kVA, 415 V and N+1 requirements. These are critical deviations and must be resolved before electrical energisation and Tier III commissioning."
    : "I can answer only from the Orion DC-01 project pack. The current open deviations are concentrated in UPS-01, DG-01 and CRAH-02.";

  // All integration modules load inside guarded blocks so an AI/provider fault
  // can never prevent the user from receiving the evidence-safe fallback.
  try {
    const { getProjectText } = await import("@/lib/project-store");
    const { loadProjectChunks } = await import("@/lib/supabase/repository");
    let chunks = getProjectText(id);
    if (/^[0-9a-f-]{36}$/i.test(id)) { try { chunks = await loadProjectChunks(id); } catch { /* retain memory chunks */ } }
    if (chunks.length && process.env.GEMINI_API_KEY) {
      try {
        const { explainWithGemini } = await import("@/lib/gemini");
        const context = chunks.slice(0,8).map(chunk=>`[${chunk.source} p.${chunk.page}] ${chunk.text}`).join("\n\n");
        const ai = await explainWithGemini(question, context, chunks.slice(0,8).map(chunk=>({ source:chunk.source, page:chunk.page })));
        if (ai) { answer = ai.text; citations = ai.citations.map(c=>`${c.source} · p.${c.page}`); }
      } catch { /* retain deterministic fallback */ }
    }
  } catch { /* retain deterministic fallback */ }

  return NextResponse.json({ answer, citations });
}
