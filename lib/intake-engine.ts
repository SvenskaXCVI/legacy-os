export const INTAKE_EXTRACTION_VERSION = "legacy-intake-v1";

export type IntakeSubmission = {
  concept?: string;
  placement?: string;
  sizeDescription?: string;
  style?: string;
  referencesSummary?: string;
  constraints?: string;
  budgetMin?: number;
  budgetMax?: number;
  targetDate?: string;
};

const clean = (value?: string) => value?.trim().replace(/\s+/g, " ") || null;

function titleFrom(concept: string, placement: string | null) {
  const shortConcept = concept
    .replace(/[^a-z0-9\s&'-]/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join(" ");
  const conceptTitle = shortConcept
    ? shortConcept.charAt(0).toUpperCase() + shortConcept.slice(1)
    : "Tattoo project";
  return placement ? `${conceptTitle} — ${placement}` : conceptTitle;
}

export function extractCandidateProject(input: IntakeSubmission) {
  const concept = clean(input.concept) || "";
  const placement = clean(input.placement);
  const sizeDescription = clean(input.sizeDescription);
  const referencesSummary = clean(input.referencesSummary);
  const constraints = clean(input.constraints);
  const targetDate = clean(input.targetDate);
  const styleTags = (input.style || "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, tags) => tags.indexOf(tag) === index);
  const budgetMinCents = Number.isFinite(input.budgetMin)
    ? Math.max(0, Math.round(Number(input.budgetMin) * 100))
    : null;
  const budgetMaxCents = Number.isFinite(input.budgetMax)
    ? Math.max(0, Math.round(Number(input.budgetMax) * 100))
    : null;

  const evidence = [
    ["concept", concept.length >= 20, concept.length],
    ["placement", Boolean(placement), placement],
    ["size", Boolean(sizeDescription), sizeDescription],
    ["style", styleTags.length > 0, styleTags],
    ["references", Boolean(referencesSummary), referencesSummary],
    ["constraints", Boolean(constraints), constraints],
    ["budget", budgetMinCents != null || budgetMaxCents != null, [budgetMinCents, budgetMaxCents]],
    ["target_date", Boolean(targetDate), targetDate],
  ].map(([field, present, value]) => ({ field, present, value }));
  const presentCount = evidence.filter((item) => item.present).length;
  const confidenceBps = Math.min(
    9500,
    3500 + presentCount * 650 + Math.min(800, concept.length * 8),
  );

  return {
    requestedTitle: titleFrom(concept, placement),
    placement,
    sizeDescription,
    styleTags,
    concept,
    referencesSummary,
    constraints,
    budgetMinCents,
    budgetMaxCents,
    targetDate,
    confidenceBps,
    extractionMethod: INTAKE_EXTRACTION_VERSION,
    evidence,
  };
}
