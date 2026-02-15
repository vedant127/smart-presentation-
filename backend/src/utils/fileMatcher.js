import fs from 'fs';
import path from 'path';

// Helper: Find Best Matching File in Directory
// Returns absolute path to file or null
export const findBestMatchFile = (dir, criteriaValues) => {
    if (!fs.existsSync(dir)) return null;

    // Normalize criteria: [ 'dubai', 'residential' ] (lowercase, trimmed)
    const tokens = criteriaValues.map(c => c.toLowerCase().trim()).filter(c => c);
    if (tokens.length === 0) return null;

    // 1. Exact Name Match "val1 + val2.pptx"
    const exactName = tokens.join(' + ') + '.pptx';
    const exactPath = path.join(dir, exactName);
    if (fs.existsSync(exactPath)) return exactPath;

    // 2. Score-Based Match
    // We want the file that contains the MOST tokens from our list.
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.pptx') && !f.startsWith('~$'));

    let bestFile = null;
    let maxScore = 0; // Score = number of matched tokens

    for (const file of files) {
        const fileLower = file.toLowerCase();
        let score = 0;

        // Count how many of our criteria tokens appear in the filename
        for (const token of tokens) {
            if (fileLower.includes(token)) {
                score++;
            }
        }

        // Rule: To be a match, it must strictly contain the FIRST token (usually City or Primary Key)
        // If the query is "Dubai Residential", we shouldn't match "Riyadh Residential.pptx" just because "Residential" matches.
        // Assumes tokens[0] is the primary differentiator (City/Market).
        if (tokens.length > 0 && !fileLower.includes(tokens[0])) {
            continue;
        }

        if (score > maxScore) {
            maxScore = score;
            bestFile = file;
        } else if (score === maxScore && score > 0) {
            // Tie-breaker: Prefer the shortest filename if scores are equal? 
            // Or prefer the one closest to the query length?
            // Actually, if we have "Dubai Residential" (2) and "Dubai Residential Luxury" (3)
            // And query is "Dubai Residential", both match 2 tokens.
            // "Dubai Residential.pptx" (length X) vs "Dubai Residential Luxury.pptx" (length Y)
            // We usually want the most specific match to what we asked?
            // If query is "Dubai", "Dubai.pptx" is better than "Dubai Residential.pptx".
            // So prefer shorter length difference.
            if (!bestFile || Math.abs(file.length - exactName.length) < Math.abs(bestFile.length - exactName.length)) {
                bestFile = file;
            }
        }
    }

    // Threshold: Match at least 1 token (or primary token enforced above)
    if (bestFile && maxScore > 0) return path.join(dir, bestFile);

    return null;
};
