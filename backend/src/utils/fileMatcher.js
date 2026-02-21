import fs from 'fs';
import path from 'path';

/**
 * findBestMatchFile
 *
 * Given a folder and an array of criteria values, find the PPTX file
 * whose name best matches the criteria.
 *
 * FILENAME FORMAT IN LIBRARY:
 *   "dubai + residential + apartments + luxury.pptx"
 *   (all lowercase, separated by " + ")
 *
 * CRITERIA COMING IN (from user form — may have any casing):
 *   ["Dubai", "Residential", "Apartments", "Luxury"]
 *
 * STRATEGY:
 *   1. Normalise both the criteria and every filename to lowercase
 *   2. Build the expected key: "dubai + residential + apartments + luxury"
 *   3. Try exact match first
 *   4. If no exact match, try partial / fuzzy match (most tokens matched)
 *   5. Return the full path of the best match, or null if nothing found
 */
export const findBestMatchFile = (folderPath, criteria = []) => {

    // ── Guard ────────────────────────────────────────────────────
    if (!fs.existsSync(folderPath)) {
        console.warn(`[FileMatcher] Folder does not exist: ${folderPath}`);
        return null;
    }

    if (!criteria || criteria.length === 0) {
        console.warn(`[FileMatcher] No criteria provided`);
        return null;
    }

    // ── Normalise helper ─────────────────────────────────────────
    const normalise = (str) =>
        String(str)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');          // collapse multiple spaces

    // ── Build the expected key ───────────────────────────────────
    // e.g. ["Dubai","Residential","Apartments","Luxury"]
    //   → "dubai + residential + apartments + luxury"
    const normalisedCriteria = criteria.map(normalise);
    const expectedKey = normalisedCriteria.join(' + ');

    console.log(`[FileMatcher] Looking in : ${folderPath}`);
    console.log(`[FileMatcher] Expected key: "${expectedKey}"`);

    // ── Read all PPTX files in the folder ────────────────────────
    const files = fs.readdirSync(folderPath).filter(f =>
        f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$')
    );

    if (files.length === 0) {
        console.warn(`[FileMatcher] No PPTX files found in: ${folderPath}`);
        return null;
    }

    // ── Step 1: Exact match (after normalising filename) ─────────
    for (const file of files) {
        // Strip .pptx extension and normalise
        const fileKey = normalise(file.replace(/\.pptx$/i, ''));
        if (fileKey === expectedKey) {
            console.log(`[FileMatcher] ✅ Exact match: "${file}"`);
            return path.join(folderPath, file);
        }
    }

    // ── Step 2: Fuzzy match — score each file by how many
    //           criteria tokens appear in the filename ────────────
    let bestFile = null;
    let bestScore = 0;

    for (const file of files) {
        const fileKey = normalise(file.replace(/\.pptx$/i, ''));

        // Split file key into tokens (split on " + " or spaces or underscores)
        const fileTokens = fileKey.split(/\s*\+\s*|\s+|_/).map(t => t.trim()).filter(Boolean);

        let score = 0;
        for (const criterion of normalisedCriteria) {
            // Check if this criterion appears anywhere in the file key
            if (fileKey.includes(criterion)) {
                score++;
            } else {
                // Try partial: each word of the criterion appears
                const words = criterion.split(/\s+/);
                const allWordsFound = words.every(w => fileTokens.some(t => t.includes(w)));
                if (allWordsFound) score += 0.5;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestFile = file;
        }
    }

    // Only accept fuzzy match if at least half the criteria matched
    const threshold = normalisedCriteria.length / 2;
    if (bestFile && bestScore >= threshold) {
        console.log(`[FileMatcher] Fuzzy match (score ${bestScore}/${normalisedCriteria.length}): "${bestFile}"`);
        return path.join(folderPath, bestFile);
    }

    // ── No match ─────────────────────────────────────────────────
    console.warn(`[FileMatcher] No match found for key: "${expectedKey}"`);
    console.warn(`[FileMatcher]    Available files: ${files.join(', ')}`);
    return null;
};

export default { findBestMatchFile };