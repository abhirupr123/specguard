import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { extractText, getDocumentProxy } from "unpdf";

export type DocumentChunk = { page:number; text:string };
export type ParsedDocument = { text:string; pages:number; chunks:DocumentChunk[] };

const normalize = (text:string) => text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

function chunkText(text:string, pages:number) {
  const blocks = normalize(text).split(/\n\n+/).filter(Boolean);
  const chunks:DocumentChunk[] = [];
  let current = ""; let page = 1;
  for (const block of blocks) {
    if ((current + "\n" + block).length > 900 && current) { chunks.push({ page, text:current }); current = block; page = Math.min(page + 1, Math.max(1, pages)); }
    else current = current ? `${current}\n${block}` : block;
  }
  if (current) chunks.push({ page, text:current });
  return chunks.length ? chunks : [{ page:1, text:"No extractable text found." }];
}

export async function parseDocument(buffer:Buffer, mimeType:string, fileName:string):Promise<ParsedDocument> {
  const lower = fileName.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const parsed = await extractText(pdf, { mergePages:false });
    const text = normalize(parsed.text.join("\n\n"));
    if (!text) throw new Error("This PDF contains no extractable text. Use a text-based PDF; scanned PDFs are not supported in v1.");
    return { text, pages:parsed.totalPages || 1, chunks:parsed.text.map((page, index)=>({ page:index + 1, text:normalize(page) })).filter(chunk=>chunk.text) };
  }
  if (mimeType.includes("wordprocessingml") || lower.endsWith(".docx")) {
    const parsed = await mammoth.extractRawText({ buffer });
    const text = normalize(parsed.value);
    if (!text) throw new Error("This DOCX contains no extractable text.");
    return { text, pages:1, chunks:chunkText(text, 1) };
  }
  if (mimeType.includes("spreadsheetml") || lower.endsWith(".xlsx")) {
    const workbook = XLSX.read(buffer, { type:"buffer" });
    const text = workbook.SheetNames.map(name => `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`).join("\n\n");
    return { text:normalize(text), pages:workbook.SheetNames.length || 1, chunks:chunkText(text, workbook.SheetNames.length || 1) };
  }
  throw new Error("Only text-based PDF, DOCX, and XLSX files are supported.");
}

export type ExtractedAsset = { tag:string; category:"UPS" | "Cooling" | "Generator"; fields:Record<string,string> };
const lineValue = (text:string, pattern:RegExp) => text.match(pattern)?.[1]?.trim();

/** Lightweight, transparent field extraction for the controlled EPC document format. */
export function extractAssets(text:string):ExtractedAsset[] {
  const tags = [...new Set(text.match(/\b(?:UPS|CRAH|DG)-\d{2}\b/gi)?.map(value=>value.toUpperCase()) ?? [])];
  return tags.map(tag => {
    const at = text.toUpperCase().indexOf(tag); const window = text.slice(Math.max(0, at - 80), at + 700);
    const category = tag.startsWith("UPS") ? "UPS" : tag.startsWith("CRAH") ? "Cooling" : "Generator";
    const fields:Record<string,string> = {};
    const capacity = lineValue(window, /(?:capacity|output)[^\n:]*[: ]\s*(\d+(?:\.\d+)?\s*(?:kVA|kW))/i); if(capacity) fields.capacity = capacity;
    const voltage = lineValue(window, /(?:voltage|supply)[^\n:]*[: ]\s*(\d+\s*V)/i); if(voltage) fields.voltage = voltage;
    const redundancy = lineValue(window, /(?:redundancy|configuration)[^\n:]*[: ]\s*(N\+?1?)/i); if(redundancy) fields.redundancy = redundancy;
    const ip = lineValue(window, /(?:protection|enclosure)[^\n:]*[: ]\s*(IP\d+)/i); if(ip) fields.ipRating = ip;
    const lead = lineValue(window, /(?:delivery|lead time)[^\n:]*[: ]\s*(\d+\s*weeks?)/i); if(lead) fields.leadTime = lead;
    return { tag, category, fields };
  });
}
