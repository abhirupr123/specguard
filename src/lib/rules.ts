import type { Severity } from "./specguard";

export type FieldRule = { id:string; assetCategory:"UPS" | "Cooling" | "Generator"; field:string; label:string; severity:Severity; expected:string };
export type ComparisonInput = { assetCategory:FieldRule["assetCategory"]; field:string; submitted:string };

export const complianceRules: FieldRule[] = [
  { id:"ups-capacity", assetCategory:"UPS", field:"capacity", label:"Capacity", severity:"Critical", expected:"500 kVA" },
  { id:"ups-voltage", assetCategory:"UPS", field:"voltage", label:"Input voltage", severity:"Critical", expected:"415 V" },
  { id:"ups-redundancy", assetCategory:"UPS", field:"redundancy", label:"Redundancy", severity:"Critical", expected:"N+1" },
  { id:"ups-ip", assetCategory:"UPS", field:"ipRating", label:"Ingress protection", severity:"High", expected:"IP31" },
  { id:"ups-delivery", assetCategory:"UPS", field:"leadTime", label:"Delivery lead time", severity:"High", expected:"8 weeks" },
  { id:"cooling-ip", assetCategory:"Cooling", field:"ipRating", label:"Ingress protection", severity:"High", expected:"IP55" },
  { id:"generator-delivery", assetCategory:"Generator", field:"leadTime", label:"Delivery lead time", severity:"High", expected:"8 weeks" },
];

/** Deterministic comparison used before any LLM explanation is requested. */
export function evaluateField(input: ComparisonInput) {
  const rule = complianceRules.find(item => item.assetCategory === input.assetCategory && item.field === input.field);
  if (!rule) return { state:"needs-review" as const, reason:"No configured compliance rule for this field." };
  if (!input.submitted.trim()) return { state:"needs-review" as const, rule, reason:"Submitted value is missing." };
  return input.submitted.trim().toLowerCase() === rule.expected.toLowerCase()
    ? { state:"compliant" as const, rule }
    : { state:"deviation" as const, rule, expected:rule.expected, actual:input.submitted };
}
