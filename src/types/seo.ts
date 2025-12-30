// SEO Configuration - Programmatic page generation vocabulary
// This file defines the controlled vocabulary for generating SEO pages

import { RELATIONS, OCCASIONS } from './gift';

// Budget ranges for SEO pages (in INR)
export const SEO_BUDGET_RANGES = [
  { label: 'under-500', min: 0, max: 500, display: 'Under ₹500' },
  { label: 'under-1000', min: 0, max: 1000, display: 'Under ₹1,000' },
  { label: 'under-2000', min: 0, max: 2000, display: 'Under ₹2,000' },
  { label: 'under-5000', min: 0, max: 5000, display: 'Under ₹5,000' },
  { label: '500-to-1000', min: 500, max: 1000, display: '₹500 - ₹1,000' },
  { label: '1000-to-2000', min: 1000, max: 2000, display: '₹1,000 - ₹2,000' },
  { label: '2000-to-5000', min: 2000, max: 5000, display: '₹2,000 - ₹5,000' },
  { label: '5000-to-10000', min: 5000, max: 10000, display: '₹5,000 - ₹10,000' },
  { label: 'above-5000', min: 5000, max: 50000, display: 'Above ₹5,000' },
] as const;

// Normalize relations for URL slugs
export const RELATION_SLUG_MAP: Record<string, string> = {
  'Mother': 'mother',
  'Father': 'father',
  'Sibling (Brother/Sister)': 'sibling',
  'Friend': 'friend',
  'Romantic Partner (Boyfriend/Girlfriend)': 'partner',
  'Spouse (Husband/Wife)': 'spouse',
  'Grandparent': 'grandparent',
  'Child (Son/Daughter)': 'child',
  'Extended Family (Aunt/Uncle/Cousin)': 'extended-family',
  'Colleague/Boss': 'colleague',
  'Teacher/Mentor': 'teacher',
  'Neighbor/Acquaintance': 'neighbor',
  'Pet Owner': 'pet-owner',
};

// Reverse mapping
export const SLUG_TO_RELATION: Record<string, string> = Object.entries(RELATION_SLUG_MAP).reduce(
  (acc, [relation, slug]) => ({ ...acc, [slug]: relation }),
  {}
);

// Normalize occasions for URL slugs
export const OCCASION_SLUG_MAP: Record<string, string> = {
  'Birthday': 'birthday',
  'Anniversary': 'anniversary',
  'Wedding': 'wedding',
  'Housewarming': 'housewarming',
  'Graduation': 'graduation',
  'Promotion / New Job': 'promotion',
  'Retirement': 'retirement',
  'Baby Shower / Newborn': 'baby-shower',
  'Valentine\'s Day': 'valentines-day',
  'Mother\'s Day': 'mothers-day',
  'Father\'s Day': 'fathers-day',
  'Christmas': 'christmas',
  'Diwali': 'diwali',
  'Raksha Bandhan': 'raksha-bandhan',
  'Holi': 'holi',
  'Eid': 'eid',
  'Thanksgiving / Gratitude': 'thanksgiving',
  'Get Well Soon': 'get-well-soon',
  'Sympathy / Condolence': 'sympathy',
  'Apology / Sorry': 'apology',
  'Just Because / Surprise': 'just-because',
  'Secret Santa / Gift Exchange': 'secret-santa',
};

// Reverse mapping
export const SLUG_TO_OCCASION: Record<string, string> = Object.entries(OCCASION_SLUG_MAP).reduce(
  (acc, [occasion, slug]) => ({ ...acc, [slug]: occasion }),
  {}
);

// SEO Page patterns - defines what combinations to generate
// IMPORTANT: Ordered from most specific to least specific for correct parsing
export const SEO_PAGE_PATTERNS = [
  // Pattern 1: /{occasion}-gifts-for-{relation}-{budget} (most specific - 3 variables)
  { type: 'occasion-relation-budget', template: '{occasion}-gifts-for-{relation}-{budget}' },
  
  // Pattern 2: /gifts-for-{relation}-{budget} (2 variables)
  { type: 'relation-budget', template: 'gifts-for-{relation}-{budget}' },
  
  // Pattern 3: /{occasion}-gifts-for-{relation} (2 variables)
  { type: 'occasion-relation', template: '{occasion}-gifts-for-{relation}' },
  
  // Pattern 4: /{occasion}-gifts-{budget} (2 variables)
  { type: 'occasion-budget', template: '{occasion}-gifts-{budget}' },
  
  // Pattern 5: /gifts-for-{relation} (1 variable)
  { type: 'relation', template: 'gifts-for-{relation}' },
  
  // Pattern 6: /{occasion}-gifts (1 variable - least specific)
  { type: 'occasion', template: '{occasion}-gifts' },
] as const;

export interface ParsedSlug {
  relation?: string;
  occasion?: string;
  budget?: {
    min: number;
    max: number;
    label: string;
    display: string;
  };
  pattern: string;
}

/**
 * Parse a URL slug into structured search intent
 * Examples:
 *   "gifts-for-mother" -> { relation: "Mother", pattern: "relation" }
 *   "birthday-gifts-for-father-under-1000" -> { relation: "Father", occasion: "Birthday", budget: {...}, pattern: "occasion-relation-budget" }
 */
export function parseSlug(slug: string): ParsedSlug | null {
  // Try each pattern
  for (const pattern of SEO_PAGE_PATTERNS) {
    const result = tryParsePattern(slug, pattern);
    if (result) {
      return result;
    }
  }
  
  return null;
}

function tryParsePattern(slug: string, pattern: typeof SEO_PAGE_PATTERNS[number]): ParsedSlug | null {
  const { type, template } = pattern;
  
  // Build regex from template using actual known values to avoid greedy matching issues
  // Create alternation patterns from known values
  const relationPattern = Object.values(RELATION_SLUG_MAP).join('|');
  const occasionPattern = Object.values(OCCASION_SLUG_MAP).join('|');
  const budgetPattern = SEO_BUDGET_RANGES.map(b => b.label).join('|');
  
  // Escape the static parts and replace placeholders with actual value patterns
  const parts = template.split(/(\{[^}]+\})/);
  let regexStr = parts.map(part => {
    if (part === '{relation}') return `(?<relation>${relationPattern})`;
    if (part === '{occasion}') return `(?<occasion>${occasionPattern})`;
    if (part === '{budget}') return `(?<budget>${budgetPattern})`;
    // Escape literal parts
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  
  const regex = new RegExp(`^${regexStr}$`);
  const match = slug.match(regex);
  
  if (!match || !match.groups) {
    return null;
  }
  
  const result: ParsedSlug = { pattern: type };
  
  // Extract and validate relation
  if (match.groups.relation) {
    const relationSlug = match.groups.relation;
    const relation = SLUG_TO_RELATION[relationSlug];
    
    if (!relation) return null; // Invalid relation
    result.relation = relation;
  }
  
  // Extract and validate occasion
  if (match.groups.occasion) {
    const occasionSlug = match.groups.occasion;
    const occasion = SLUG_TO_OCCASION[occasionSlug];
    
    if (!occasion) return null; // Invalid occasion
    result.occasion = occasion;
  }
  
  // Extract and validate budget
  if (match.groups.budget) {
    const budgetSlug = match.groups.budget;
    const budget = SEO_BUDGET_RANGES.find(b => b.label === budgetSlug);
    
    if (!budget) return null; // Invalid budget
    result.budget = budget;
  }
  
  return result;
}

/**
 * Generate all possible SEO URLs based on patterns and vocabulary
 * This is used at build time to create static pages
 */
export function generateAllSeoUrls(): string[] {
  const urls: string[] = [];
  
  const relationSlugs = Object.values(RELATION_SLUG_MAP);
  const occasionSlugs = Object.values(OCCASION_SLUG_MAP);
  const budgetSlugs = SEO_BUDGET_RANGES.map(b => b.label);
  
  for (const pattern of SEO_PAGE_PATTERNS) {
    const { type, template } = pattern;
    
    switch (type) {
      case 'relation':
        // Generate: gifts-for-{relation}
        for (const relation of relationSlugs) {
          urls.push(template.replace('{relation}', relation));
        }
        break;
        
      case 'relation-budget':
        // Generate: gifts-for-{relation}-{budget}
        for (const relation of relationSlugs) {
          for (const budget of budgetSlugs) {
            urls.push(template.replace('{relation}', relation).replace('{budget}', budget));
          }
        }
        break;
        
      case 'occasion-relation':
        // Generate: {occasion}-gifts-for-{relation}
        for (const occasion of occasionSlugs) {
          for (const relation of relationSlugs) {
            urls.push(template.replace('{occasion}', occasion).replace('{relation}', relation));
          }
        }
        break;
        
      case 'occasion-relation-budget':
        // Generate: {occasion}-gifts-for-{relation}-{budget}
        // Limit this pattern to avoid explosion (only popular occasions)
        const popularOccasions = ['birthday', 'anniversary', 'christmas', 'diwali'];
        for (const occasion of popularOccasions) {
          for (const relation of relationSlugs) {
            // Only generate for 3 most common budget ranges to avoid bloat
            for (const budget of budgetSlugs.slice(0, 3)) {
              urls.push(
                template
                  .replace('{occasion}', occasion)
                  .replace('{relation}', relation)
                  .replace('{budget}', budget)
              );
            }
          }
        }
        break;
        
      case 'occasion':
        // Generate: {occasion}-gifts
        for (const occasion of occasionSlugs) {
          urls.push(template.replace('{occasion}', occasion));
        }
        break;
        
      case 'occasion-budget':
        // Generate: {occasion}-gifts-{budget}
        for (const occasion of occasionSlugs) {
          for (const budget of budgetSlugs) {
            urls.push(template.replace('{occasion}', occasion).replace('{budget}', budget));
          }
        }
        break;
    }
  }
  
  return urls;
}

/**
 * Generate related URLs for internal linking
 */
export function generateRelatedUrls(parsed: ParsedSlug): { title: string; url: string }[] {
  const related: { title: string; url: string }[] = [];
  
  // Add parent pages
  if (parsed.relation) {
    const relationSlug = RELATION_SLUG_MAP[parsed.relation];
    related.push({
      title: `All Gifts for ${parsed.relation}`,
      url: `/gifts-for-${relationSlug}`,
    });
  }
  
  if (parsed.occasion) {
    const occasionSlug = OCCASION_SLUG_MAP[parsed.occasion];
    related.push({
      title: `All ${parsed.occasion} Gifts`,
      url: `/${occasionSlug}-gifts`,
    });
  }
  
  // Add budget variants (if relation exists)
  if (parsed.relation && !parsed.budget) {
    const relationSlug = RELATION_SLUG_MAP[parsed.relation];
    const budgetSamples = SEO_BUDGET_RANGES.slice(0, 3);
    
    for (const budget of budgetSamples) {
      related.push({
        title: `Gifts for ${parsed.relation} ${budget.display}`,
        url: `/gifts-for-${relationSlug}-${budget.label}`,
      });
    }
  }
  
  return related.slice(0, 6); // Limit to 6 related links
}
