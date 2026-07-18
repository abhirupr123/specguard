type Citation = { source:string; page?:number };

/** Optional server-side Gemini adapter; seeded demo works without credentials. */
export async function explainWithGemini(question:string, context:string, citations:Citation[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  // Dynamic import keeps the browser/client bundle and server route module
  // free of SDK side effects until a Gemini call is actually required.
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(apiKey);
  // Stable, high-quota default for extraction and cited project Q&A.
  const model = client.getGenerativeModel({ model:process.env.GEMINI_MODEL || "gemini-3.1-flash-lite" });
  const prompt = `You are SpecGuard, an EPC compliance assistant. Answer only from the supplied project context. If evidence is insufficient, say so. Do not invent requirements.\n\nQuestion: ${question}\n\nContext:\n${context}\n\nCitations: ${citations.map(c=>`${c.source}${c.page ? ` p.${c.page}` : ""}`).join(", ")}`;
  const result = await model.generateContent(prompt);
  return { text:result.response.text(), citations };
}
