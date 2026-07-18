import { NextRequest, NextResponse } from "next/server";
import { findings } from "@/lib/specguard";
export async function GET() { return NextResponse.json({ findings }); }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id:string }> }) { const { id } = await params; const body = await request.json(); return NextResponse.json({ id, status: body.status ?? "Open", owner: body.owner ?? "Unassigned" }); }
