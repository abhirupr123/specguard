import { NextResponse } from "next/server";
import { createProject } from "@/lib/supabase/repository";
export async function POST() { try { const project = await createProject("Untitled project"); return NextResponse.json(project, { status:201 }); } catch { return NextResponse.json({ id:crypto.randomUUID(), name:"Untitled project", createdAt:new Date().toISOString(), persistence:"pending" }, { status:201 }); } }
