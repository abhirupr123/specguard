import { describe, expect, it } from "vitest";
import { cosineSimilarity, deduplicateChunks, keywordScore, rankEvidence } from "./retrieval";
import type { EvidenceChunk } from "./types";

const chunk = (id:string, source:string, text:string, page=1, origin:EvidenceChunk["origin"]="seeded"):EvidenceChunk => ({ id, source, page, text, origin });

describe("Copilot evidence retrieval", () => {
  it("boosts exact asset tags and technical terms", () => {
    const matching = keywordScore("Why does UPS-01 require N+1?", chunk("1","UPS submittal","UPS-01 configuration N+1"));
    const unrelated = keywordScore("Why does UPS-01 require N+1?", chunk("2","Generator offer","DG-01 delivery 12 weeks"));
    expect(matching).toBeGreaterThan(unrelated);
  });

  it("deduplicates identical source, page, and evidence", () => {
    const evidence = chunk("1","Specification","Minimum capacity 500 kVA",12);
    expect(deduplicateChunks([evidence,{ ...evidence, id:"2" }])).toHaveLength(1);
  });

  it("uses semantic similarity together with keyword relevance", async () => {
    const evidence = [chunk("1","Cooling","CRAH enclosure protection"),chunk("2","Generator","Delivery lead time")];
    const vectors = [[1,0],[.9,.1],[0,1]];
    const ranked = await rankEvidence("cooling protection",evidence,async()=>vectors,2);
    expect(ranked[0].id).toBe("1");
    expect(cosineSimilarity(vectors[0],vectors[1])).toBeGreaterThan(cosineSimilarity(vectors[0],vectors[2]));
  });

  it("falls back to keyword ranking when embeddings fail", async () => {
    const evidence = [chunk("1","UPS","Input voltage 415 V"),chunk("2","CRAH","Protection IP55")];
    const ranked = await rankEvidence("What voltage is required?",evidence,async()=>{ throw new Error("provider unavailable"); },2);
    expect(ranked[0].id).toBe("1");
  });

  it("limits repetitive chunks from one document", async () => {
    const evidence = Array.from({length:5},(_,index)=>chunk(String(index),"Specification",`UPS capacity requirement ${index}`,index + 1));
    evidence.push(chunk("vendor","Vendor submittal","UPS submitted capacity 400 kVA"));
    const ranked = await rankEvidence("UPS capacity",evidence,undefined,8);
    expect(ranked.filter(item=>item.source === "Specification")).toHaveLength(3);
    expect(ranked.some(item=>item.id === "vendor")).toBe(true);
  });
});
