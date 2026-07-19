export type ChatRole = "user" | "assistant";

export type ChatHistoryItem = { role:ChatRole; content:string };

export type EvidenceChunk = {
  id:string;
  source:string;
  page:number;
  text:string;
  origin:"uploaded" | "persisted" | "seeded";
};

export type CopilotCitation = { source:string; description:string; page:number; excerpt:string };
export type CopilotMode = "gemini" | "fallback" | "insufficient";

export type CopilotResponse = {
  answer:string;
  grounded:boolean;
  mode:CopilotMode;
  citations:CopilotCitation[];
};
