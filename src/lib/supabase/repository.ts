import "server-only";
import type { ExtractedAsset, ParsedDocument } from "@/lib/documents/parser";
import { getSupabaseServer } from "./server";

export async function createProject(name:string, location?:string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from("projects").insert({ name, location }).select("id,name,location,created_at").single();
  if (error) throw error; return data;
}

export async function persistDocument(projectId:string, file:File, parsed:ParsedDocument, extractedAssets:ExtractedAsset[]) {
  const supabase = getSupabaseServer(); const documentId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const storagePath = `${projectId}/${documentId}-${safeName}`;
  const { error:uploadError } = await supabase.storage.from("project-documents").upload(storagePath, await file.arrayBuffer(), { contentType:file.type, upsert:false });
  if (uploadError) throw uploadError;
  const { data:document, error:documentError } = await supabase.from("documents").insert({ id:documentId, project_id:projectId, title:file.name, mime_type:file.type, storage_path:storagePath, page_count:parsed.pages, extracted_assets:extractedAssets }).select("id").single();
  if (documentError) { await supabase.storage.from("project-documents").remove([storagePath]); throw documentError; }
  const { error:chunkError } = await supabase.from("document_chunks").insert(parsed.chunks.map(chunk=>({ document_id:document.id, page_number:chunk.page, content:chunk.text })));
  if (chunkError) throw chunkError;
  return { id:document.id, storagePath };
}

export async function loadProjectChunks(projectId:string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from("document_chunks").select("page_number,content,documents!inner(title,project_id)").eq("documents.project_id",projectId).limit(200);
  if(error) throw error;
  return (data ?? []).map((row: { page_number:number; content:string; documents:unknown })=>{
    const relation = row.documents as { title?:string } | { title?:string }[] | null;
    const source = Array.isArray(relation) ? relation[0]?.title : relation?.title;
    return { page:row.page_number, text:row.content, source:source ?? "Project document" };
  });
}
