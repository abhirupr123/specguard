const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = require("docx");

const out = path.resolve(__dirname, "../public/reference-documents");
fs.mkdirSync(out, { recursive:true });

async function pdf(name, title, sections) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595,842]); let y = 790;
  const line = (text, isBold=false, size=11) => { if(y < 55){page=doc.addPage([595,842]); y=790;} page.drawText(text,{x:52,y,size,font:isBold?bold:font,color:rgb(.1,.14,.23)}); y-= size+9; };
  line(title, true, 20); y -= 8;
  for(const section of sections){ line(section.heading, true, 13); for(const text of section.lines) line(text); y-=7; }
  await fs.promises.writeFile(path.join(out,name), await doc.save());
}

async function docx(name, title, sections) {
  const children=[new Paragraph({text:title,heading:HeadingLevel.TITLE})];
  for(const section of sections){ children.push(new Paragraph({text:section.heading,heading:HeadingLevel.HEADING_1})); section.lines.forEach(line=>children.push(new Paragraph({children:[new TextRun(line)]}))); }
  const file = new Document({sections:[{children}]});
  await fs.promises.writeFile(path.join(out,name), await Packer.toBuffer(file));
}

async function main(){
  await pdf("client-technical-specification.pdf", "Orion DC-01 Client Technical Specification", [
    {heading:"1. Critical Power — UPS",lines:["UPS-01 shall provide a minimum rated output of 500 kVA.","Nominal supply voltage shall be 415 V, three phase, 50 Hz.","The UPS shall be configured to maintain N+1 modular redundancy.","Indoor UPS enclosure shall satisfy a minimum protection class of IP31.","The UPS supplier shall provide factory acceptance test evidence before site release."]},
    {heading:"2. Cooling — CRAH",lines:["CRAH-01 and CRAH-02 shall each provide 120 kW sensible cooling capacity.","CRAH external service sections shall comply with IP55 as a minimum.","Cooling controls shall accept 415 V, three phase, 50 Hz supply."]},
    {heading:"3. Emergency Generation",lines:["DG-01 and DG-02 shall provide 1250 kVA standby capacity at 415 V.","Generator enclosure protection shall be IP55 minimum.","Fuel autonomy shall be not less than 24 hours at rated load."]}
  ]);
  const rows=[
    ["Asset Tag","Category","Approved capacity","Voltage","Redundancy","IP rating","Lead time"],
    ["UPS-01","UPS","500 kVA","415 V","N+1","IP31","8 weeks"],["UPS-02","UPS","500 kVA","415 V","N+1","IP31","8 weeks"],
    ["CRAH-01","Cooling","120 kW","415 V","N+1","IP55","10 weeks"],["CRAH-02","Cooling","120 kW","415 V","N+1","IP55","10 weeks"],
    ["DG-01","Generator","1250 kVA","415 V","N+1","IP55","8 weeks"],["DG-02","Generator","1250 kVA","415 V","N+1","IP55","8 weeks"]
  ];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),"Approved Schedule"); XLSX.writeFile(wb,path.join(out,"approved-equipment-schedule.xlsx"));
  await pdf("voltedge-ups-submittal.pdf", "VoltEdge Vendor Submittal — UPS Package", [
    {heading:"Submitted model: UPS-01",lines:["Proposed UPS-01: rated output capacity 400 kVA.","Nominal input voltage: 400 V, three phase, 50 Hz.","Configuration supplied as N modular system.","Standard enclosure protection: IP20.","Manufacturing lead time: 12 weeks after purchase order."]},
    {heading:"Submitted model: UPS-02",lines:["Proposed UPS-02: rated output capacity 500 kVA.","Nominal input voltage: 415 V, three phase, 50 Hz.","Configuration supplied as N+1 modular system.","Standard enclosure protection: IP31.","Manufacturing lead time: 8 weeks after purchase order."]}
  ]);
  await docx("aerocool-crah-submittal.docx", "AeroCool Vendor Submittal — CRAH Package", [
    {heading:"Submitted model: CRAH-01",lines:["Sensible cooling capacity: 120 kW.","Power supply: 415 V, three phase, 50 Hz.","Protection class: IP55.","Control redundancy: N+1."]},
    {heading:"Submitted model: CRAH-02",lines:["Sensible cooling capacity: 120 kW.","Power supply: 415 V, three phase, 50 Hz.","Protection class: IP54.","Control redundancy: N+1."]}
  ]);
  await pdf("primegen-generator-offer.pdf", "PrimeGen Vendor Offer — Generator Package", [
    {heading:"Submitted model: DG-01",lines:["Standby capacity: 1250 kVA.","Nominal voltage: 415 V, three phase.","Enclosure protection: IP55.","Fuel autonomy: 24 hours at rated load.","Estimated ex-works delivery: 12 weeks after purchase order."]},
    {heading:"Submitted model: DG-02",lines:["Standby capacity: 1250 kVA.","Nominal voltage: 415 V, three phase.","Enclosure protection: IP55.","Fuel autonomy: 24 hours at rated load."]}
  ]);
  await docx("commissioning-checklist.docx", "Orion DC-01 Commissioning Release Checklist", [
    {heading:"Pre-release gate",lines:["All capacity, voltage and redundancy deviations must be resolved before electrical energisation.","Vendor submittals must reference an approved technical specification.","Factory acceptance test certificates must be reviewed before integrated systems testing."]},
    {heading:"Evidence requirement",lines:["Each open finding must preserve the approved requirement and submitted evidence with a source-page reference."]}
  ]);
  console.log(`Created Orion DC-01 reference documents in ${out}`);
}
main().catch(error=>{console.error(error);process.exit(1)});
