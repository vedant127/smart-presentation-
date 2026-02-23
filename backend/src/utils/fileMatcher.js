import fs from 'fs';
import path from 'path';

/**
 * ─────────────────────────────────────────────────────────────
 *  NORMALISE HELPER
 *  Convert any string to plain lowercase, collapse whitespace
 * ─────────────────────────────────────────────────────────────
 */
const norm = (str) =>
    String(str || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');


/**
 * ─────────────────────────────────────────────────────────────
 *  normalisePlotContext
 *
 *  Accepts a raw "plot.data" / "plot.criteria" object that may
 *  have any key casing:
 *    { City: 'Dubai', 'Asset Type': 'Residential', … }
 *    { city: 'dubai', assetType: 'Residential', … }
 *    { CITY: 'DUBAI', ASSET_TYPE: 'residential', … }
 *
 *  Returns a normalised object ALWAYS with these 4 lowercase keys:
 *    { city, assetType, category, specifications }
 * ─────────────────────────────────────────────────────────────
 */
export const normalisePlotContext = (raw = {}) => {
    // Build a flat, lowercase-key lookup so we're case-insensitive
    const lookup = {};
    for (const [k, v] of Object.entries(raw)) {
        lookup[norm(k).replace(/\s+/g, '')] = v;   // e.g. 'assettype'
        lookup[norm(k).replace(/[\s_-]+/g, '')] = v; // extra-safe collapse
    }

    const get = (...aliases) => {
        for (const alias of aliases) {
            const key = norm(alias).replace(/[\s_-]+/g, '');
            if (lookup[key]) return String(lookup[key]).trim();
        }
        return '';
    };

    return {
        city: get('city'),
        assetType: get('assettype', 'asset type', 'assetType', 'asset_type'),
        category: get('category'),
        specifications: get('specifications', 'specs', 'specification'),
    };
};


/**
 * ─────────────────────────────────────────────────────────────
 *  buildSearchTokens
 *
 *  Given a normalised context, produce ORDERED tokens that match
 *  the Library filename convention:
 *    "city + assetType + category + specifications"
 *  Only non-empty tokens are included.
 * ─────────────────────────────────────────────────────────────
 */
export const buildSearchTokens = (ctx) => {
    const n = normalisePlotContext(ctx);
    return [n.city, n.assetType, n.category, n.specifications]
        .map(t => norm(t))
        .filter(Boolean);
};


/**
 * ─────────────────────────────────────────────────────────────
 *  findBestMatchFile
 *
 *  Given a folder path and an array of search tokens,
 *  find the PPTX file whose ` + `-separated name best matches.
 *
 *  LIBRARY FILENAME CONVENTION:
 *    "dubai + residential + apartments + luxury.pptx"
 *
 *  STRATEGY
 *    1. Exact match (normalised tokens == normalised file key)
 *    2. Fuzzy  match (most tokens found in filename)
 *    3. Return null if threshold not met
 * ─────────────────────────────────────────────────────────────
 */
export const findBestMatchFile = (folderPath, criteria = []) => {

    // ── Guard ────────────────────────────────────────────────
    if (!fs.existsSync(folderPath)) {
        console.warn(`[FileMatcher] Folder does not exist: ${folderPath}`);
        return null;
    }

    const tokens = criteria.map(norm).filter(Boolean);
    if (tokens.length === 0) {
        console.warn(`[FileMatcher] No criteria/tokens provided`);
        return null;
    }

    const expectedKey = tokens.join(' + ');
    console.log(`[FileMatcher] Looking in  : ${folderPath}`);
    console.log(`[FileMatcher] Expected key: "${expectedKey}"`);

    // ── Read PPTX files ──────────────────────────────────────
    const files = fs.readdirSync(folderPath)
        .filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'));

    if (files.length === 0) {
        console.warn(`[FileMatcher] No PPTX files in: ${folderPath}`);
        return null;
    }

    // ── Step 1: Exact match ──────────────────────────────────
    for (const file of files) {
        const fileKey = norm(file.replace(/\.pptx$/i, ''));
        if (fileKey === expectedKey) {
            console.log(`[FileMatcher] ✅ Exact match: "${file}"`);
            return path.join(folderPath, file);
        }
    }

    // ── Step 2: Fuzzy match ──────────────────────────────────
    let bestFile = null;
    let bestScore = 0;

    for (const file of files) {
        const fileKey = norm(file.replace(/\.pptx$/i, ''));
        const fileTokens = fileKey.split(/\s*\+\s*|\s+|_/).map(t => t.trim()).filter(Boolean);

        let score = 0;
        for (const token of tokens) {
            if (fileKey.includes(token)) {
                score++;                        // full token found
            } else {
                const words = token.split(/\s+/);
                if (words.every(w => fileTokens.some(ft => ft.includes(w)))) {
                    score += 0.5;              // partial word match
                }
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestFile = file;
        }
    }

    // Accept if at least half of criteria matched
    const threshold = tokens.length / 2;
    if (bestFile && bestScore >= threshold) {
        console.log(`[FileMatcher] 🟡 Fuzzy match (${bestScore}/${tokens.length}): "${bestFile}"`);
        return path.join(folderPath, bestFile);
    }

    // ── No suitable match ────────────────────────────────────
    console.warn(`[FileMatcher] ❌ No match for: "${expectedKey}"`);
    console.warn(`[FileMatcher]    Available   : ${files.join(', ')}`);
    return null;
};


export default { findBestMatchFile, normalisePlotContext, buildSearchTokens };