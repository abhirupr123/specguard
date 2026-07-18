export type Severity = "Critical" | "High" | "Medium" | "Low";
export type FindingStatus = "Open" | "Under Review" | "Resolved";
export type Readiness = "Blocked" | "At Risk" | "Ready" | "Pending Review";

export type Asset = { id:string; tag:string; category:string; name:string; readiness:Readiness; reason:string };
export type Finding = { id:string; assetId:string; rule:string; expected:string; actual:string; severity:Severity; status:FindingStatus; milestone:string; recommendation:string; approvedEvidence:string; vendorEvidence:string; approvedCitation:string; vendorCitation:string };
export type Document = { id:string; title:string; type:string; pages:number; state:string; description:string };

export const assets: Asset[] = [
  {id:"ups-01", tag:"UPS-01", category:"UPS", name:"Main UPS System A", readiness:"Blocked", reason:"Three critical electrical deviations remain open."},
  {id:"cr-02", tag:"CRAH-02", category:"Cooling", name:"Data Hall CRAH Unit", readiness:"At Risk", reason:"Ingress protection rating needs confirmation."},
  {id:"dg-01", tag:"DG-01", category:"Generator", name:"Emergency Diesel Generator", readiness:"At Risk", reason:"Delivery date misses commissioning buffer."},
  {id:"ups-02", tag:"UPS-02", category:"UPS", name:"Main UPS System B", readiness:"Ready", reason:"Approved submittal is compliant."},
  {id:"cr-01", tag:"CRAH-01", category:"Cooling", name:"Data Hall CRAH Unit", readiness:"Ready", reason:"All technical fields are compliant."},
  {id:"dg-02", tag:"DG-02", category:"Generator", name:"Emergency Diesel Generator", readiness:"Pending Review", reason:"Vendor test certificate is pending review."},
];

export const findings: Finding[] = [
  {id:"F-001",assetId:"ups-01",rule:"Capacity",expected:"500 kVA",actual:"400 kVA",severity:"Critical",status:"Open",milestone:"Integrated Systems Testing",recommendation:"Reject the submitted model and request a 500 kVA, N+1 compliant alternative.",approvedEvidence:"UPS-01 shall provide a minimum rated output of 500 kVA.",vendorEvidence:"Proposed UPS-01: rated output capacity 400 kVA.",approvedCitation:"Client Technical Specification · p.12",vendorCitation:"VoltEdge UPS Submittal · p.4"},
  {id:"F-002",assetId:"ups-01",rule:"Input voltage",expected:"415 V",actual:"400 V",severity:"Critical",status:"Open",milestone:"Electrical Energisation",recommendation:"Request a 415 V configuration or provide approved design-change evidence.",approvedEvidence:"Nominal supply voltage shall be 415 V, three phase, 50 Hz.",vendorEvidence:"Nominal input voltage: 400 V, three phase, 50 Hz.",approvedCitation:"Client Technical Specification · p.12",vendorCitation:"VoltEdge UPS Submittal · p.4"},
  {id:"F-003",assetId:"ups-01",rule:"Redundancy",expected:"N+1",actual:"N",severity:"Critical",status:"Under Review",milestone:"Tier III Commissioning",recommendation:"Revise the module arrangement to N+1; do not release for factory acceptance testing.",approvedEvidence:"The UPS shall be configured to maintain N+1 modular redundancy.",vendorEvidence:"Configuration supplied as N modular system.",approvedCitation:"Client Technical Specification · p.13",vendorCitation:"VoltEdge UPS Submittal · p.5"},
  {id:"F-004",assetId:"ups-01",rule:"Ingress protection",expected:"IP31",actual:"IP20",severity:"High",status:"Open",milestone:"Site Installation",recommendation:"Confirm the equipment-room environmental classification and submit an IP31 enclosure.",approvedEvidence:"Indoor UPS enclosure shall satisfy a minimum protection class of IP31.",vendorEvidence:"Standard enclosure protection: IP20.",approvedCitation:"Client Technical Specification · p.14",vendorCitation:"VoltEdge UPS Submittal · p.6"},
  {id:"F-005",assetId:"dg-01",rule:"Delivery lead time",expected:"8 weeks",actual:"12 weeks",severity:"High",status:"Open",milestone:"Generator FAT",recommendation:"Escalate procurement; secure an expedited production slot or approved alternate supplier.",approvedEvidence:"Critical power equipment shall be delivered within eight weeks of purchase order.",vendorEvidence:"Estimated ex-works delivery: twelve weeks after purchase order.",approvedCitation:"Approved Equipment Schedule · p.3",vendorCitation:"PrimeGen Offer · p.2"},
  {id:"F-006",assetId:"cr-02",rule:"Ingress protection",expected:"IP55",actual:"IP54",severity:"High",status:"Under Review",milestone:"Cooling Commissioning",recommendation:"Obtain written approval for the IP54 deviation or provide an IP55 compliant unit.",approvedEvidence:"CRAH external service sections shall comply with IP55 as a minimum.",vendorEvidence:"Protection class: IP54.",approvedCitation:"Client Technical Specification · p.28",vendorCitation:"AeroCool CRAH Submittal · p.3"},
];

export const documents: Document[] = [
  {id:"D-001",title:"Client Technical Specification",type:"PDF",pages:48,state:"Processed",description:"Approved performance and protection requirements"},
  {id:"D-002",title:"Approved Equipment Schedule",type:"XLSX",pages:3,state:"Processed",description:"Tags, capacity and delivery baselines"},
  {id:"D-003",title:"VoltEdge UPS Submittal",type:"PDF",pages:14,state:"Processed",description:"Vendor proposal for UPS-01 and UPS-02"},
  {id:"D-004",title:"AeroCool CRAH Submittal",type:"PDF",pages:11,state:"Processed",description:"Vendor proposal for CRAH equipment"},
  {id:"D-005",title:"PrimeGen Generator Offer",type:"PDF",pages:9,state:"Processed",description:"Vendor proposal for diesel generators"},
  {id:"D-006",title:"Commissioning Checklist",type:"DOCX",pages:7,state:"Processed",description:"Pre-commissioning release criteria"},
];

export const compliance = { totalAssets: assets.length, reviewed: 6, open: findings.filter(f=>f.status!=="Resolved").length, critical: findings.filter(f=>f.severity==="Critical" && f.status!=="Resolved").length };
export const severityClass = (severity:string) => severity.toLowerCase().replace(" ", "-");
export const readinessClass = (readiness:string) => readiness === "At Risk" ? "risk" : readiness.toLowerCase().replace(" ", "-");
