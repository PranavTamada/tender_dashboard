/**
 * Keyword & department matching engine.
 *
 * Requirements satisfied:
 *  - Case insensitive
 *  - Partial match capable (e.g. "Mobile Application" → "Mobile App")
 *  - Singular / plural tolerant (e.g. "information tool(s)", "website(s)")
 *  - De-duplicated matches (canonical labels collected into a Set)
 *  - Special IT-department override → tagged as a DEPARTMENT match
 *
 * Matching strategy: each canonical keyword owns a set of "terms". A term is
 * compiled into a regex requiring a leading word boundary, whitespace-flexible
 * internal spacing, and an optional plural suffix on the final token. Tricky
 * partial cases (e.g. application ⊃ app) are handled by explicit synonym terms
 * rather than blind substring matching, which keeps false positives low.
 */

export interface KeywordGroup {
  /** Canonical label reported in `matchedKeywords`. */
  label: string;
  /** Surface terms (each plural-tolerant) that trigger this group. */
  terms: string[];
}

export const KEYWORD_GROUPS: KeywordGroup[] = [
  // Bare "app" collided with "APP" (Atactic Polypropylene waterproofing
  // membrane); require software-app phrasing instead.
  { label: "App", terms: ["mobile app", "web app", "app development", "software application", "application software"] },
  { label: "Website", terms: ["website", "web site"] },
  { label: "Chatbot", terms: ["chatbot", "chat bot"] },
  { label: "Mobile App", terms: ["mobile app", "mobile application"] },
  { label: "Website Widgets", terms: ["website widget", "web widget"] },
  // Bare "ai" / "ml" collided with volume units and stray tokens (e.g. "500
  // mL"); require AI/ML-qualified phrasing. Full phrases live in their own
  // groups below.
  { label: "AI", terms: ["ai based", "ai-based", "ai powered", "ai-powered", "ai enabled", "ai-enabled", "ai solution", "ai model", "ai tool", "ai system", "ai/ml"] },
  { label: "Artificial Intelligence", terms: ["artificial intelligence"] },
  { label: "Machine Learning", terms: ["machine learning"] },
  { label: "ML", terms: ["machine learning", "ml model", "ml algorithm", "ml-based", "ml based", "ai/ml"] },
  {
    label: "Conversational Chatbot",
    terms: ["conversational chatbot", "conversational ai", "conversational bot"],
  },
  { label: "WhatsApp Bot", terms: ["whatsapp bot", "whats app bot"] },
  { label: "Telegram Bot", terms: ["telegram bot"] },
  { label: "Information Tools", terms: ["information tool"] },
  { label: "Automation", terms: ["automation", "automate"] },
  { label: "Customer Service", terms: ["customer service"] },
  { label: "Customer Support", terms: ["customer support"] },
  { label: "Dashboard", terms: ["dashboard"] },
  { label: "AI Chatbot Development", terms: ["ai chatbot development", "ai chatbot"] },
  {
    label: "Custom Software Development",
    terms: ["custom software development", "custom software", "software development"],
  },
  { label: "Website Development", terms: ["website development", "web development"] },
  { label: "Mobile App Development", terms: ["mobile app development", "app development"] },
  { label: "AI Automation", terms: ["ai automation"] },
  { label: "Data Analytics", terms: ["data analytics", "data analysis"] },
  {
    label: "Digital Transformation Consulting",
    terms: ["digital transformation consulting", "digital transformation"],
  },
  // ── Expanded IT/software service categories ──
  { label: "Computer Vision", terms: ["computer vision"] },
  { label: "NLP", terms: ["natural language processing", "nlp"] },
  { label: "Generative AI", terms: ["generative ai", "gen ai"] },
  { label: "Web Application", terms: ["web application", "web app"] },
  { label: "Web Portal", terms: ["web portal", "online portal", "web-based portal"] },
  { label: "API Integration", terms: ["api integration", "api development"] },
  { label: "ERP", terms: ["erp", "enterprise resource planning"] },
  // CRM/GIS/MIS bare acronyms collide with non-IT terms (CRM retaining wall,
  // GIS = Gas Insulated Switchgear, MIS in unrelated text), so we match only
  // their unambiguous full phrases.
  { label: "CRM", terms: ["customer relationship management", "crm software", "crm system", "crm solution"] },
  { label: "MIS", terms: ["management information system"] },
  { label: "System Integration", terms: ["system integration", "systems integrator"] },
  { label: "Cloud", terms: ["cloud migration", "cloud computing", "cloud hosting", "cloud infrastructure"] },
  { label: "SaaS", terms: ["saas", "software as a service"] },
  { label: "GIS", terms: ["geographic information system", "gis mapping", "gis based", "gis platform"] },
  { label: "IoT", terms: ["iot", "internet of things"] },
  { label: "RPA", terms: ["rpa", "robotic process automation"] },
  { label: "Business Intelligence", terms: ["business intelligence", "power bi"] },
  { label: "E-Governance", terms: ["e-governance", "e governance", "egovernance", "e-gov"] },
  { label: "Digital Platform", terms: ["digital platform"] },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile a multi-word term into a plural-tolerant, boundary-anchored regex.
 * The final token gets an optional `(e?s)?` plural suffix; a trailing
 * non-word lookahead prevents matching inside longer unrelated words.
 */
function termToPattern(term: string): string {
  const tokens = term.trim().toLowerCase().split(/\s+/);
  const compiled = tokens.map((tok, i) => {
    const isLast = i === tokens.length - 1;
    // Plural tolerance only for last tokens longer than 3 chars. Short
    // acronyms (AI, ML, ICT, IT, app) match EXACTLY — this prevents "AI" from
    // matching "AIS"/"Airport" or "IT" from matching "items".
    if (isLast && tok.length > 3) {
      const stem = tok.endsWith("s") ? tok.replace(/s$/, "") : tok;
      return `${escapeRegex(stem)}(?:e?s)?`;
    }
    return escapeRegex(tok);
  });
  // \b leading boundary, \s+ between tokens, (?!\w) trailing to block partials.
  return `\\b${compiled.join("\\s+")}(?!\\w)`;
}

const COMPILED_GROUPS: { label: string; regex: RegExp }[] = KEYWORD_GROUPS.map(
  (g) => ({
    label: g.label,
    regex: new RegExp(g.terms.map(termToPattern).join("|"), "i"),
  }),
);

/**
 * Return the de-duplicated list of canonical keyword labels found in any of
 * the provided text fragments (title, description, scope, bid text, etc.).
 */
export function matchKeywords(...fragments: (string | null | undefined)[]): string[] {
  const haystack = fragments.filter(Boolean).join("  \n  ").toLowerCase();
  if (!haystack.trim()) return [];
  const matched = new Set<string>();
  for (const { label, regex } of COMPILED_GROUPS) {
    if (regex.test(haystack)) matched.add(label);
  }
  return [...matched];
}

export function hasKeywordMatch(
  ...fragments: (string | null | undefined)[]
): boolean {
  return matchKeywords(...fragments).length > 0;
}

// ── Department override ──────────────────────────────────────────────────

/** Human-readable list of IT departments that bypass keyword matching. */
export const IT_DEPARTMENT_LABELS = [
  "Information Technology Department",
  "Information Technology & Communications Department",
  "IT Department",
  "IT & Communications",
  "ITE&C",
  "Information and Communications Technology",
  "ICT",
] as const;

const DEPARTMENT_PATTERNS: RegExp[] = [
  /\binformation\s+technology\b/i,
  /\bite\s*&\s*c\b/i, // ITE&C
  /\bit\s*&\s*communications?\b/i,
  /\bit\s+department\b/i,
  /\binformation\s+(and|&)\s+communications?\s+technology\b/i,
  /\bict\b/i,
];

/**
 * Educational/research bodies whose names contain "Information Technology"
 * (e.g. "Indian Institute of Information Technology" / IIIT) but which are NOT
 * IT departments. These must not trigger the department override.
 */
const EDU_EXCLUSION =
  /\b(institute|institutes|college|university|universities|vidyalaya|polytechnic|iiit|iiits|iit|nit|school|academy|research|laboratory)\b/i;

/**
 * True when a tender belongs to an IT / ICT government department and should
 * be included even with no keyword match. Matches the department/organization
 * against IT-department patterns, but excludes educational & research bodies
 * (IIITs, universities, etc.) whose names merely contain "Information
 * Technology" — those only qualify via a real keyword match instead.
 */
export function isDepartmentMatch(
  department?: string | null,
  organization?: string | null,
): boolean {
  const text = [department, organization].filter(Boolean).join(" ");
  if (!text.trim()) return false;
  if (EDU_EXCLUSION.test(text)) return false;
  return DEPARTMENT_PATTERNS.some((re) => re.test(text));
}
