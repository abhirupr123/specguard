"use client";

import { FormEvent, useMemo, useState } from "react";
import { assets, compliance, documents, findings as seedFindings, Finding, FindingStatus, readinessClass, severityClass } from "@/lib/specguard";

type View = "overview" | "findings" | "passport" | "documents" | "copilot";

const nav: { id: View; label: string }[] = [
  { id: "overview", label: "▦  Overview" },
  { id: "findings", label: "⚠  Compliance findings" },
  { id: "passport", label: "✓  Readiness passport" },
  { id: "documents", label: "▤  Documents" },
  { id: "copilot", label: "✦  Project copilot" },
];

type AnalysisCheck = { state:string; tag:string; field:string; document:string; expected?:string; actual?:string; rule?:{ label:string; severity:Finding["severity"]; expected:string } };

function Badge({ value, kind }: { value:string; kind?:string }) { return <span className={`badge ${kind ?? value.toLowerCase().replace(" ", "-")}`}>{value}</span>; }

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [projectId, setProjectId] = useState("workspace");
  const [findings, setFindings] = useState(seedFindings);
  const [selectedId, setSelectedId] = useState("F-001");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [toast, setToast] = useState("");
  const selected = findings.find(f => f.id === selectedId) ?? findings[0];
  const open = findings.filter(f => f.status !== "Resolved");
  const critical = open.filter(f => f.severity === "Critical").length;

  const flash = (message:string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const updateStatus = (status:FindingStatus) => { setFindings(current => current.map(f => f.id === selected.id ? { ...f, status } : f)); flash(`${selected.id} marked ${status}`); };
  const refreshProject = async () => { const response = await fetch("/api/projects/reference", { method:"POST" }); const data = await response.json(); setProjectId(data.project.id); setFindings(seedFindings); setView("overview"); flash("Orion DC-01 project workspace refreshed"); };
  const goToFinding = (id:string) => { setSelectedId(id); setView("findings"); };
  const applyAnalysis = (checks: AnalysisCheck[]) => {
    const deviations = checks.filter(check => check.state === "deviation" && check.rule).map((check, index): Finding => {
      const asset = assets.find(item => item.tag === check.tag);
      const rule = check.rule!;
      const milestone = /capacity|voltage|redundancy/i.test(check.field) ? "Electrical Energisation" : /lead/i.test(check.field) ? "Procurement Release" : "Site Installation";
      return { id:`UP-${index + 1}`, assetId:asset?.id ?? check.tag.toLowerCase(), rule:rule.label, expected:check.expected ?? rule.expected, actual:check.actual ?? "Not provided", severity:rule.severity, status:"Open", milestone, recommendation:`Review ${check.tag} ${rule.label.toLowerCase()} deviation and obtain a compliant revised submittal.`, approvedEvidence:`Configured requirement: ${check.expected ?? rule.expected}.`, vendorEvidence:`Extracted submitted value: ${check.actual ?? "Not provided"}.`, approvedCitation:"Configured compliance rule", vendorCitation:check.document };
    });
    if (deviations.length) { setFindings(deviations); setSelectedId(deviations[0].id); flash(`${deviations.length} compliance finding(s) created from uploaded documents`); }
    else flash("No configured deviations were detected in the uploaded documents");
  };

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">S</span>SpecGuard</div><div className="top-meta"><span>● Orion DC-01 · Navi Mumbai</span><span>Evidence-first EPC intelligence</span></div></header>
    <div className="layout">
      <aside className="sidebar"><div className="project-label">Active project</div><div className="project-name">Orion DC-01</div>{nav.map(item => <button key={item.id} className={`nav-button ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}>{item.label}</button>)}<div className="sidebar-foot"><strong>Evidence workspace</strong><br/>Each compliance decision is traceable to its approved requirement and submitted source.</div></aside>
      <main className="main">
        {toast && <div className="toast" role="status"><span className="toast-icon">✓</span><div><strong>Update complete</strong><span>{toast}</span></div></div>}
        {view === "overview" && <Overview open={open.length} critical={critical} onLoad={refreshProject} onFinding={goToFinding} />}
        {view === "findings" && <FindingsView findings={findings} selected={selected} query={query} filter={filter} setQuery={setQuery} setFilter={setFilter} onSelect={setSelectedId} onStatus={updateStatus} />}
        {view === "passport" && <Passport findings={findings} onFinding={goToFinding} onDocuments={()=>setView("documents")} />}
        {view === "documents" && <Documents projectId={projectId} onLoad={refreshProject} onAnalyzed={applyAnalysis} flash={flash} />}
        {view === "copilot" && <Copilot projectId={projectId} />}
      </main>
    </div>
  </div>;
}

function Overview({ open, critical, onLoad, onFinding }: { open:number; critical:number; onLoad:()=>void; onFinding:(id:string)=>void }) {
  return <><div className="header-row"><div><p className="eyebrow">Project intelligence workspace</p><h1>Commissioning readiness, with proof.</h1><p className="sub">Orion DC-01 · Data centre EPC delivery · Last analysis: just now</p></div><div className="header-actions"><button className="button" onClick={onLoad}>↻ Refresh project</button><button className="button primary" onClick={() => onFinding("F-001")}>Review critical issue</button></div></div>
    <section className="stats"><div className="stat"><div className="stat-label">ASSETS REVIEWED</div><div className="stat-value">{compliance.reviewed}/{compliance.totalAssets}</div><div className="stat-note">Across three equipment packages</div></div><div className="stat stat-critical"><div className="stat-label">CRITICAL DEVIATIONS</div><div className="stat-value">{critical}</div><div className="stat-note">Block commissioning release</div></div><div className="stat"><div className="stat-label">OPEN FINDINGS</div><div className="stat-value">{open}</div><div className="stat-note">Need a project decision</div></div><div className="stat stat-good"><div className="stat-label">READY ASSETS</div><div className="stat-value">2</div><div className="stat-note">Approved and evidence complete</div></div></section>
    <section className="grid-two"><div className="card"><h2 className="card-title">Priority compliance findings</h2><p className="card-sub">Highest-risk deviations that can delay energisation or commissioning.</p>{seedFindings.slice(0,4).map(f => <div className="status-row" key={f.id}><div><div className="asset-title">{assets.find(a=>a.id===f.assetId)?.tag} · {f.rule}</div><div className="asset-meta">Expected {f.expected} · Submitted {f.actual}</div></div><button className="link" onClick={()=>onFinding(f.id)}>View evidence →</button><Badge value={f.severity} kind={severityClass(f.severity)} /></div>)}</div>
      <div className="card"><h2 className="card-title">Readiness snapshot</h2><p className="card-sub">Current release state by critical equipment package.</p>{[["Ready",2,"ready"],["At risk",2,"risk"],["Blocked",1,"blocked"],["Pending review",1,"pending"]].map(([label,count,style])=><div className="bar-wrap" key={String(label)}><div className="bar-label"><span>{String(label)}</span><strong>{String(count)} assets</strong></div><div className="bar"><span className={String(style)} style={{width:`${Number(count)/6*100}%`}} /></div></div>)}<div className="tip"><strong>Decision required:</strong> UPS-01 cannot proceed to electrical energisation until its capacity, voltage, and redundancy deviations are closed.</div></div></section></>;
}

function FindingsView({ findings, selected, query, filter, setQuery, setFilter, onSelect, onStatus }: { findings:Finding[]; selected:Finding; query:string; filter:string; setQuery:(v:string)=>void; setFilter:(v:string)=>void; onSelect:(id:string)=>void; onStatus:(s:FindingStatus)=>void }) {
  const visible = useMemo(()=>findings.filter(f => (filter === "All" || f.severity === filter) && `${f.rule} ${f.expected} ${f.actual} ${f.id}`.toLowerCase().includes(query.toLowerCase())),[findings,filter,query]);
  return <><div className="header-row"><div><p className="eyebrow">Evidence-backed decisions</p><h1>Compliance findings</h1><p className="sub">Compare approved requirements against vendor submissions before site release.</p></div><Badge value={`${findings.filter(f=>f.status!=="Resolved").length} OPEN`} kind="medium" /></div>
  <div className="card"><div className="table-tools"><input className="input" aria-label="Search findings" placeholder="Search finding, asset, requirement…" value={query} onChange={e=>setQuery(e.target.value)} /><select className="select" aria-label="Filter by severity" value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Critical</option><option>High</option><option>Medium</option></select></div><table className="findings"><thead><tr><th>Finding</th><th>Requirement vs submitted</th><th>Milestone</th><th>Severity</th><th>Status</th></tr></thead><tbody>{visible.map(f=><tr key={f.id} onClick={()=>onSelect(f.id)}><td><div className="finding-title">{assets.find(a=>a.id===f.assetId)?.tag} · {f.rule}</div><div className="finding-desc">{f.id}</div></td><td><strong>{f.expected}</strong><div className="finding-desc">Submitted: {f.actual}</div></td><td>{f.milestone}</td><td><Badge value={f.severity} kind={severityClass(f.severity)} /></td><td><Badge value={f.status} kind={f.status === "Open" ? "medium" : f.status === "Resolved" ? "ready" : "pending"} /></td></tr>)}</tbody></table></div>
  <section className="card" style={{marginTop:18}}><div className="header-row"><div><h2 className="card-title">{selected.id} · {assets.find(a=>a.id===selected.assetId)?.tag} {selected.rule} deviation</h2><p className="card-sub">Rule verdict is deterministic; text below is preserved as source evidence.</p></div><Badge value={selected.severity} kind={severityClass(selected.severity)} /></div><div className="detail"><div className="evidence"><h3>Approved requirement</h3><p className="quote">“{selected.approvedEvidence}”</p><p className="citation">{selected.approvedCitation}</p></div><div className="evidence"><h3>Vendor submission</h3><p className="quote">“{selected.vendorEvidence}”</p><p className="citation">{selected.vendorCitation}</p></div></div><div className="callout"><strong>Commissioning impact:</strong> This deviation affects <strong>{selected.milestone}</strong>. {selected.recommendation}</div><div className="action-grid"><label className="field">FINDING STATUS<select className="select" value={selected.status} onChange={e=>onStatus(e.target.value as FindingStatus)}><option>Open</option><option>Under Review</option><option>Resolved</option></select></label><label className="field">ACTION OWNER<input className="input" defaultValue="Electrical package lead" /></label><button className="button primary" onClick={()=>onStatus("Under Review")}>Assign corrective action</button></div></section></>;
}

function Passport({ findings, onFinding, onDocuments }: { findings:Finding[]; onFinding:(id:string)=>void; onDocuments:()=>void }) {
  return <><div className="header-row"><div><p className="eyebrow">Release control</p><h1>Commissioning readiness passport</h1><p className="sub">One traceable release state for each major asset.</p></div><button className="button primary" onClick={()=>onFinding("F-001")}>Resolve UPS-01</button></div><div className="passport">{assets.map(asset => { const findingId=findings.find(finding=>finding.assetId === asset.id)?.id; const opensFinding=Boolean(findingId); const label=asset.readiness === "Ready" ? "View approval evidence →" : opensFinding ? "Review linked finding →" : "Review source documents →"; return <article className="passport-item" key={asset.id}><div className="passport-head"><div><div className="asset-title">{asset.tag}</div><div className="asset-meta">{asset.name}</div></div><Badge value={asset.readiness} kind={readinessClass(asset.readiness)} /></div><p>{asset.reason}</p><button className="link passport-link" onClick={()=>findingId ? onFinding(findingId) : onDocuments()}>{label}</button></article>; })}</div><div className="card" style={{marginTop:18}}><h2 className="card-title">Release rule</h2><p className="sub">An asset becomes <strong>Blocked</strong> when any capacity, voltage, or redundancy deviation is unresolved. It becomes <strong>At Risk</strong> when an open delivery or protection-class finding can affect a planned milestone.</p></div></>;
}

function Documents({ projectId, onLoad, onAnalyzed, flash }: { projectId:string; onLoad:()=>void; onAnalyzed:(checks:AnalysisCheck[])=>void; flash:(m:string)=>void }) {
  const [upload,setUpload]=useState<{name:string; details:string; error?:boolean} | null>(null);
  const [analysis,setAnalysis]=useState<{documents:number;checks:number;deviations:number} | null>(null);
  const [analyzing,setAnalyzing]=useState(false);
  const onFile=async(event:React.ChangeEvent<HTMLInputElement>)=>{const f=event.target.files?.[0]; if(!f)return; if(f.size>10*1024*1024){flash("File rejected: maximum size is 10 MB");return;} const form=new FormData();form.append("file",f);setUpload({name:f.name,details:"Processing document…"});try{const response=await fetch(`/api/projects/${projectId}/documents`,{method:"POST",body:form});const data=await response.json();if(!response.ok)throw new Error(data.error);setUpload({name:f.name,details:`Processed ${data.pages} page(s), ${data.chunks} evidence chunk(s), ${data.extractedAssets.length} asset record(s) extracted.${data.persisted ? " Saved to Supabase." : ""}`});flash(`${f.name} processed successfully`);}catch(error){setUpload({name:f.name,details:error instanceof Error ? error.message : "Document processing failed.",error:true});flash("Document processing failed");}};
  const analyze=async()=>{setAnalyzing(true);try{const response=await fetch(`/api/projects/${projectId}/analyze`,{method:"POST"});const data=await response.json();if(!response.ok)throw new Error();const deviations=data.checks.filter((check:AnalysisCheck)=>check.state === "deviation").length;setAnalysis({documents:data.analyzedDocuments,checks:data.checks.length,deviations});onAnalyzed(data.checks);flash(data.analyzedDocuments ? "Uploaded documents analyzed successfully" : "No uploaded documents were found");}catch{flash("Analysis could not be completed");}finally{setAnalyzing(false);}};
  return <><div className="header-row"><div><p className="eyebrow">Source of truth</p><h1>Project documents</h1><p className="sub">Every finding is traceable to a processed source record and page reference.</p></div><div className="header-actions"><label className="button primary">Upload document<input type="file" accept=".pdf,.docx,.xlsx" hidden onChange={onFile}/></label><button className="button" disabled={analyzing} onClick={analyze}>{analyzing ? "Analyzing…" : "Analyze uploads"}</button><button className="button" onClick={onLoad}>Refresh project sources</button></div></div>{upload && <div className={`tip ${upload.error ? "" : ""}`}><strong>{upload.name}</strong> — {upload.details}</div>}{analysis && <section className={`analysis-panel ${analysis.documents ? "complete" : "empty-analysis"}`}><div className="analysis-icon">{analysis.documents ? "✓" : "↑"}</div><div className="analysis-copy"><strong>{analysis.documents ? "Compliance analysis complete" : "No uploaded documents yet"}</strong><span>{analysis.documents ? "The rules engine compared every extracted field with the approved project baseline." : "Upload an incoming PDF, DOCX, or XLSX file before running the rules engine."}</span></div>{analysis.documents > 0 && <div className="analysis-metrics"><span><strong>{analysis.documents}</strong> document</span><span><strong>{analysis.checks}</strong> checks</span><span className={analysis.deviations ? "has-deviations" : ""}><strong>{analysis.deviations}</strong> deviations</span></div>}</section>}<div className="docs-grid">{documents.map(doc=>{const slug=doc.id === "D-001" ? "client-technical-specification.pdf" : doc.id === "D-002" ? "approved-equipment-schedule.xlsx" : doc.id === "D-003" ? "voltedge-ups-submittal.pdf" : doc.id === "D-004" ? "aerocool-crah-submittal.docx" : doc.id === "D-005" ? "primegen-generator-offer.pdf" : "commissioning-checklist.docx";return <article className="doc-card" key={doc.id}><div className="doc-icon">{doc.type === "PDF" ? "▧" : doc.type === "XLSX" ? "▦" : "▤"}</div><h3>{doc.title}</h3><p>{doc.description}</p><p style={{marginTop:8}}>{doc.type} · {doc.pages} pages</p><a className="link" href={`/reference-documents/${slug}`} target="_blank" rel="noreferrer">Open source file ↗</a><div className="doc-state">● {doc.state}</div></article>})}</div></> }

function Copilot({ projectId }: { projectId:string }) {
  type Citation = { source:string; description:string; page:number; excerpt:string };
  type Message = { question:string; answer:string; citations:Citation[]; mode:"gemini" | "fallback" | "insufficient"; grounded:boolean };
  const [question,setQuestion]=useState("Why is UPS-01 blocked?");
  const [messages,setMessages]=useState<Message[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const ask=async(event:FormEvent)=>{
    event.preventDefault(); const currentQuestion=question.trim(); if(!currentQuestion || loading)return;
    const history=messages.slice(-3).flatMap(message=>[
      { role:"user", content:message.question },
      { role:"assistant", content:message.answer },
    ]);
    setLoading(true); setError("");
    try {
      const response=await fetch(`/api/projects/${projectId}/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:currentQuestion,history})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error || "The Copilot could not answer this question.");
      setMessages(current=>[...current,{question:currentQuestion,answer:data.answer,citations:data.citations,mode:data.mode,grounded:data.grounded}]);
      setQuestion("");
    } catch(cause) { setError(cause instanceof Error ? cause.message : "The Copilot could not answer this question. Your question has been preserved."); }
    finally { setLoading(false); }
  };
  return <><div className="header-row"><div><p className="eyebrow">Document-aware project intelligence</p><h1>Project copilot</h1><p className="sub">Gemini explains project decisions using Orion DC-01 documents. The supporting source cards show judges where every conclusion came from.</p></div></div><div className="card"><div className="chat" aria-live="polite">{messages.length===0 && <div className="chat-answer">Ask a project question, for example: <strong>“Why is UPS-01 blocked?”</strong>, <strong>“Which findings threaten commissioning?”</strong>, or <strong>“What corrective action is recommended for the generator?”</strong></div>}{messages.map((message,index)=><div className="chat-exchange" key={`${message.question}-${index}`}><div className="chat-question">{message.question}</div><div className={`chat-answer ${message.mode === "insufficient" ? "chat-insufficient" : ""}`}><div className="chat-answer-head"><span>{message.mode === "gemini" ? "Copilot response" : message.mode === "insufficient" ? "Answer not found in project documents" : "Limited offline response"}</span></div><div className="chat-answer-text">{message.answer}</div>{message.citations.length>0 && <><div className="evidence-heading">Supporting project evidence</div><div className="citation-grid">{message.citations.map((citation,citationIndex)=><article className="citation-card" key={`${citation.source}-${citation.page}-${citationIndex}`}><div className="citation-source">Source document: {citation.source}</div><div className="citation-description">{citation.description} · Page {citation.page}</div><p>{citation.excerpt}</p></article>)}</div></>}</div></div>)}{loading && <div className="chat-answer chat-loading">Retrieving relevant project evidence and preparing a cited answer…</div>}</div>{error && <div className="chat-error" role="alert">{error}</div>}<form className="chat-form" onSubmit={ask}><input className="input" value={question} maxLength={2000} disabled={loading} onChange={event=>setQuestion(event.target.value)} placeholder="Ask about any requirement, asset, document, or open finding…"/><button className="button primary" type="submit" disabled={loading || !question.trim()}>{loading ? "Checking evidence…" : "Ask copilot"}</button></form></div></>;
}
