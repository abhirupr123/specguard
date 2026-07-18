import { NextResponse } from "next/server";
import { assets, findings } from "@/lib/specguard";
import { getDocuments } from "@/lib/project-store";
import { evaluateField } from "@/lib/rules";

export async function POST(_request:Request, { params }: { params: Promise<{ id:string }> }) {
  const { id } = await params; const uploaded = getDocuments(id);
  const checks = uploaded.flatMap(document => document.extractedAssets.flatMap(asset => Object.entries(asset.fields).map(([field, submitted]) => ({ document:document.title, tag:asset.tag, field, ...evaluateField({ assetCategory:asset.category, field, submitted }) }))));
  return NextResponse.json({ state:"complete", analyzedDocuments:uploaded.length, checks, assets, findings });
}
