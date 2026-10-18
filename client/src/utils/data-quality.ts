import type { Company } from "@shared/schema";

export interface DataQualityScore {
  score: number;
  maxScore: number;
  percentage: number;
  level: 'excellent' | 'good' | 'poor' | 'very-poor';
  needsScrollWall: boolean;
  completedFields: string[];
  missingFields: string[];
}

/**
 * Known boilerplate/generic descriptions that were bulk-assigned and carry
 * no real information about the specific company. Treat these the same as
 * a missing description for quality-scoring purposes.
 */
const GENERIC_DESCRIPTIONS = new Set([
  "Svenskt industriföretag med fokus på tekniska tjänster och lösningar.",
  "Mekanisk verkstad som erbjuder reparations- och underhållstjänster för industrin.",
  "Utrustningsföretag som levererar tekniska lösningar till industrin.",
  "Svetsföretag som erbjuder professionella svetstjänster och metallbearbetning.",
  "Industriautomationsföretag som erbjuder tekniska lösningar och system.",
  "Byggföretag specialiserat på industriella konstruktioner.",
  "Underhålls- och reparationsföretag för industriell utrustning.",
  "unavailable",
]);

/**
 * Returns true if the description is a known generic placeholder, or is
 * shorter than 150 characters (too brief to be genuinely useful).
 */
export function isGenericDescription(text: string | null | undefined): boolean {
  if (!text || text.trim() === "") return true;
  const trimmed = text.trim();
  if (GENERIC_DESCRIPTIONS.has(trimmed)) return true;
  // Also flag very short descriptions and ones that just restate the company name
  if (trimmed.length < 150) return true;
  return false;
}

export function calculateDataQuality(company: Company): DataQualityScore {
  const qualityChecks = {
    hasDescription: () => {
      const desc = company.description_sv || company.description;
      return !isGenericDescription(desc);
    },
    hasContactEmail: () => company.contactEmail && company.contactEmail.trim() !== '',
    hasPhone: () => company.phone && company.phone.trim() !== '',
    hasWebsite: () => company.website && company.website.trim() !== '',
    hasAddress: () => company.address && company.address.trim() !== '',
    hasServiceområden: () =>
      company.serviceområden && Array.isArray(company.serviceområden) && company.serviceområden.length > 0,
    hasCategories: () =>
      company.categories && Array.isArray(company.categories) && company.categories.length > 0,
  };

  const checks = Object.entries(qualityChecks);
  const completedChecks = checks.filter(([_, check]) => check());
  const score = completedChecks.length;
  const maxScore = checks.length;
  const percentage = (score / maxScore) * 100;

  // Determine quality level
  let level: DataQualityScore['level'];
  if (score >= 6) {
    level = 'excellent';
  } else if (score >= 4) {
    level = 'good';
  } else if (score >= 2) {
    level = 'poor';
  } else {
    level = 'very-poor';
  }

  // Companies with ≤3 complete fields need scroll wall
  const needsScrollWall = score <= 3;

  const completedFields = completedChecks.map(([key]) => key);
  const missingFields = checks
    .filter(([_, check]) => !check())
    .map(([key]) => key);

  return {
    score,
    maxScore,
    percentage,
    level,
    needsScrollWall,
    completedFields,
    missingFields,
  };
}

export function getDataQualityMessage(quality: DataQualityScore): string {
  const messages = {
    'excellent': 'Utmärkt information - komplett företagsprofil',
    'good': 'Bra information - några detaljer saknas',
    'poor': 'Ofullständig information - behöver kompletteras',
    'very-poor': 'Mycket begränsad information - behöver omfattande komplettering',
  };

  return messages[quality.level];
}

export function getScrollWallIntensity(quality: DataQualityScore): 'light' | 'medium' | 'heavy' {
  if (quality.level === 'very-poor') return 'heavy';
  if (quality.level === 'poor') return 'medium';
  return 'light';
}
