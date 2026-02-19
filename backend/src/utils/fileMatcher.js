
import fs from 'fs';
import path from 'path';

const log = console.log;

// Helper: Normalize query string (e.g. "Spec 1" -> "spec1")
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

// Helper: Find Best Matching File in Directory (STRICT)
// Returns absolute path to file or null
export const findBestMatchFile = (dir, criteriaValues) => {
    if (!fs.existsSync(dir)) return null;

    // Tokens: [ 'dubai', 'residential', 'apartments', 'luxury' ]
    const tokens = criteriaValues.map(c => String(c).trim()).filter(c => c);
    if (tokens.length === 0) return null;

    // 1. Exact Name Match (The Gold Standard)
    // "Dubai + Residential + Apartments + Luxury.pptx"
    // Try case-insensitive matching for the exact constructed filename
    const exactName = tokens.join(' + ') + '.pptx';
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'));

    // Check for exact match (normalized)
    const exactMatch = files.find(f => normalize(f) === normalize(exactName));
    if (exactMatch) return path.join(dir, exactMatch);

    // 2. Strict Subset Match
    // We want a file that contains ALL of our requested tokens if possible.
    // If we asked for "Dubai + Residential", we prefer "Dubai + Residential.pptx" over "Dubai + Residential + Luxury.pptx" if it exists.
    // BUT we also accept "Dubai + Residential + Luxury" if "Dubai + Residential" doesn't exist? 
    // Wait, the user said: "Dubai + Residential + Mixed-use" -> Select matching file.

    // Let's Score:
    // +1 for every token matched
    // -0.5 for every extra token in filename that wasn't asked for (penalty for being too specific?)
    // Actually, usually Library files are SPECIFIC logic.
    // If Library has "Dubai + Residential.pptx" and we ask for "Dubai + Residential + Luxury", we want the most specific one that matches strictly?
    // It's safer to rely on "Most Matched Tokens".

    let bestFile = null;
    let maxScore = -1;

    for (const file of files) {
        const fileNorm = normalize(file.replace('.pptx', ''));
        // "dubairesidentialapartmentsluxury"

        // Count matches
        let matchCount = 0;
        let allTokensFound = true;

        for (const token of tokens) {
            const tokenNorm = normalize(token);
            if (fileNorm.includes(tokenNorm)) {
                matchCount++;
            } else {
                // If a requested token is missing (e.g. asked for "Apartments" but file is "Villas"), this file is WRONG.
                // UNLESS the file is generic (e.g. just "Dubai + Residential").
                // So failure to match a token is not fatal, but lowers score?
                // Actually, if I ask for "Dubai", I shouldn't get "Riyadh".
                // So unmatched tokens in the QUERY are NOT fatal if the file is generic?
                // No, if I ask for "Dubai", "Riyadh" file has 0 matches.

                // What if I ask for "Dubai + Apartments" and file is "Dubai + Villas"?
                // "Dubai" matches. "Villas" doesn't match "Apartments".
                // Score = 1.
                // File "Dubai + Apartments" -> Score = 2.
                // So Score Logic works.
            }
        }

        // Critical Rule: First Token (City) must match?
        // Usually token[0] is City.
        const firstTokenNorm = normalize(tokens[0]);
        if (!fileNorm.includes(firstTokenNorm)) {
            continue; // Mismatch on primary key (City) -> Skip
        }

        // Penalty for extra length? (Prefer exact matches)
        // If query = "Dubai", file1="Dubai", file2="DubaiResidential"
        // file1 score=1, file2 score=1.
        // We prefer file1.
        // So tie-breaker = shortest length.

        if (matchCount > maxScore) {
            maxScore = matchCount;
            bestFile = file;
        } else if (matchCount === maxScore) {
            // Tie-breaker: Shortest filename (closest to exact generic match)
            if (file.length < bestFile.length) {
                bestFile = file;
            }
        }
    }

    if (bestFile && maxScore > 0) return path.join(dir, bestFile);
    return null;
};
