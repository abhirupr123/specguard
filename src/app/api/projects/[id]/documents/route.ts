import { NextRequest, NextResponse } from "next/server";
import { extractAssets, parseDocument } from "@/lib/documents/parser";
import { saveDocument } from "@/lib/project-store";
import { persistDocument } from "@/lib/supabase/repository";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  const { id:projectId } = await params;
  const data = await request.formData(); const file = data.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "A document file is required." }, { status: 400 });
  const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "Upload a text-based PDF, DOCX, or XLSX file." }, { status: 415 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Files must be 10 MB or smaller." }, { status: 413 });
  try {
    const parsed = await parseDocument(Buffer.from(await file.arrayBuffer()), file.type, file.name);
    const extractedAssets = extractAssets(parsed.text);
    const document = saveDocument(projectId, { id:crypto.randomUUID(), title:file.name, mimeType:file.type, parsed, extractedAssets, uploadedAt:new Date().toISOString() });
    let persisted = false;
    if (/^[0-9a-f-]{36}$/i.test(projectId)) { try { await persistDocument(projectId, file, parsed, extractedAssets); persisted = true; } catch { /* Seeded memory mode remains available until migration is applied. */ } }
    return NextResponse.json({ id:document.id, title:file.name, state:"Processed", persisted, pages:parsed.pages, chunks:parsed.chunks.length, extractedAssets:document.extractedAssets }, { status: 201 });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : "Document processing failed." }, { status: 422 }); }
}
