/**
 * Unified key builder for Library filename matching.
 * Maps both simple form data and schema plot criteria to consistent keys.
 *
 * Key format: city_assetType_category_specs_price
 * Examples:
 *   - dubai_residential_luxury_apartments_2m_5m_aed
 *   - dubai_residential_apartments_luxury (legacy, no price)
 */
import fs from 'fs';
import path from 'path';

const VALUE_MAP = {
  hotels: 'hotel', hotel: 'hotel', residential: 'residential', office: 'office', retail: 'retail',
  '3-star': '3_star', '3 star': '3_star', '4-star': '4_star', '4 star': '4_star',
  '5-star': '5_star', '5 star': '5_star',
  'small regional mall': 'small_regional_mall', 'regional mall': 'regional_mall',
  'community mall': 'community_mall', 'neighbourhood center': 'neighbourhood_center',
  'convenience center': 'convenience_center',
  'beach resort': 'beach_resort', business: 'business', city: 'city', leisure: 'leisure',
  apartments: 'apartments', villas: 'villas', townhouses: 'townhouses',
  'luxury apartments': 'luxury_apartments', 'studio apartments': 'studio_apartments',
  penthouses: 'penthouses',
  luxury: 'luxury', 'high end': 'high_end', 'upper mid end': 'upper_mid_end', 'mid end': 'mid_end',
  'low end': 'low_end', affordable: 'affordable', social: 'social',
  'grade a': 'grade_a', 'grade b': 'grade_b',
  'abu dhabi': 'abu_dhabi', abudhabi: 'abu_dhabi', dubai: 'dubai', riyadh: 'riyadh',
  jeddah: 'jeddah', doha: 'doha', 'kuwait city': 'kuwait_city',
  'under 1m aed': 'under_1m_aed', '1m - 2m aed': '1m_2m_aed', '2m - 5m aed': '2m_5m_aed',
  '5m - 10m aed': '5m_10m_aed', '10m+ aed': '10m_plus_aed',
  'aed 3m–5m': '2m_5m_aed', '3m - 5m aed': '2m_5m_aed',
};

function normToken(val) {
  if (!val || typeof val !== 'string') return '';
  const lower = String(val).trim().toLowerCase();
  const withUnderscores = lower.replace(/\s+/g, '_').replace(/–/g, '-').replace(/-/g, '_');
  return VALUE_MAP[lower] ?? VALUE_MAP[withUnderscores] ?? withUnderscores.replace(/[^a-z0-9_]/g, '');
}

/** Normalize price range to token: "2M - 5M AED" -> "2m_5m_aed" */
function normPriceRange(val) {
  if (!val || typeof val !== 'string') return '';
  const lower = String(val).trim().toLowerCase();
  if (VALUE_MAP[lower]) return VALUE_MAP[lower];
  const s = lower
    .replace(/aed\s*/gi, '')
    .replace(/\s*[-–]\s*/g, '_')
    .replace(/\s+/g, '_')
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9_]/g, '');
  return s || '';
}

/**
 * Extract category from property type: "Luxury Apartments" -> "Apartments", "Studio Apartments" -> "Apartments"
 */
function extractCategory(pt) {
  if (!pt) return 'apartments';
  const lower = String(pt).toLowerCase();
  if (lower.includes('apartment')) return 'apartments';
  if (lower.includes('villa')) return 'villas';
  if (lower.includes('townhouse')) return 'townhouses';
  if (lower.includes('penthouse')) return 'penthouses';
  return normToken(pt);
}

/**
 * Convert simple form data to criteria object (for schema compatibility).
 * Form: { city, propertyType, assetCategory, priceRange, numberOfUnits, ... }
 * Criteria: { City, 'Asset Type', Category, Specifications }
 */
export function formDataToCriteria(formData) {
  if (!formData || typeof formData !== 'object') return {};
  const city = formData.city || formData.City || '';
  const propertyType = formData.propertyType || formData.property_type || formData.Category || '';
  const assetCategory = formData.assetCategory || formData.asset_category || formData['Asset Type'] || 'Residential';
  const priceRange = formData.priceRange || formData.price_range || formData.Specifications || formData.specifications || '';

  return {
    City: city,
    'Asset Type': assetCategory,
    Category: propertyType || 'Apartments',
    Specifications: priceRange || (propertyType && /luxury/i.test(propertyType) ? 'Luxury' : ''),
    city,
    assetType: assetCategory,
    category: propertyType,
    specifications: priceRange,
  };
}

/**
 * Build key from criteria (schema plot format) or form data.
 * Supports both naming conventions.
 */
export function buildKey(input) {
  if (!input || typeof input !== 'object') return '';

  const raw = [
    input.City || input.city || '',
    input['Asset Type'] || input.assetType || input.asset_type || '',
    input.Category || input.category || '',
    input.Specifications || input.specifications || input.specs || input.spec || '',
  ];
  const parts = raw.map(s => normToken(String(s || '')));
  return parts.filter(Boolean).join('_');
}

/**
 * Build key from simple form data, INCLUDING price range.
 * Format: city_assetCategory_propertyType_priceRange
 * Example: dubai_residential_luxury_apartments_2m_5m_aed
 */
export function buildKeyFromForm(formData) {
  if (!formData || typeof formData !== 'object') return '';

  const c = formDataToCriteria(formData);
  const city = normToken(c.City || c.city || '');
  const assetCategory = normToken(c['Asset Type'] || c.assetType || 'residential');
  const propertyType = normToken(c.Category || c.category || c.propertyType || '');
  const specs = normToken(c.Specifications || c.specifications || '');
  const priceRange = normPriceRange(formData.priceRange || formData.price_range || c.Specifications || c.specifications || '');

  const parts = [city, assetCategory, propertyType];
  if (specs && specs !== priceRange) parts.push(specs);
  if (priceRange) parts.push(priceRange);
  return [...new Set(parts)].filter(Boolean).join('_');
}

/**
 * Get keys to try when matching Library files (with fallbacks).
 * 1. Full key with price
 * 2. Key without price (legacy)
 */
export function getKeysToTry(formDataOrCriteria) {
  const keyWithPrice = buildKeyFromForm(formDataToCriteria(formDataOrCriteria));
  const keyLegacy = buildKey(formDataToCriteria(formDataOrCriteria));
  const keys = [...new Set([keyWithPrice, keyLegacy].filter(Boolean))];
  return keys;
}

/**
 * Find best matching PPTX file in folder.
 * Tries exact match first, then fuzzy.
 */
export function findMatchingFile(folderPath, formDataOrCriteria) {
  if (!fs.existsSync(folderPath)) return null;

  const keysToTry = getKeysToTry(formDataOrCriteria);
  const files = fs.readdirSync(folderPath)
    .filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'));

  for (const key of keysToTry) {
    const filename = `${key}.pptx`;
    const fullPath = path.join(folderPath, filename);
    if (fs.existsSync(fullPath)) return fullPath;
  }

  // Fuzzy: find file with most matching tokens
  const tokens = keysToTry[0]?.split('_').filter(Boolean) || [];
  let best = null;
  let bestScore = 0;
  for (const file of files) {
    const fileKey = file.replace(/\.pptx$/i, '').toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (fileKey.includes(t)) score++;
    }
    if (score > bestScore && score >= tokens.length / 2) {
      bestScore = score;
      best = path.join(folderPath, file);
    }
  }
  return best;
}

export default { buildKey, buildKeyFromForm, formDataToCriteria, getKeysToTry, findMatchingFile, normToken };
