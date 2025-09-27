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

export function calculateDataQuality(company: Company): DataQualityScore {
  const qualityChecks = {
    hasDescription: () => {
      const desc = company.description_sv || company.description;
      return desc && desc.length >= 50;
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
