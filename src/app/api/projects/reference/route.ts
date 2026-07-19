import { NextResponse } from "next/server";
import { assets, documents, findings } from "@/lib/specguard";
import { createProject } from "@/lib/supabase/repository";

export async function POST() {
  try {
    const project = await createProject("Orion DC-01", "Navi Mumbai");
    return NextResponse.json({ project, assets, documents, findings });
  } catch {
    return NextResponse.json({ project: { id: crypto.randomUUID(), name:"Orion DC-01", location:"Navi Mumbai", persistence:"pending" }, assets, documents, findings });
  }
}
