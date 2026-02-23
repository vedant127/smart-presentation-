import path from 'path';
import fs from 'fs';
import { findBestMatchFile, normalisePlotContext, buildSearchTokens } from '../utils/fileMatcher.js';

// ──────────────────────────────────────────────────────────────────────────────
// Configuration of the 10-Section Structure for Feasibility Study
// Maps logical Section Number (1-10) to Library Folder and behavior
//
// CORRECT folder structure (lowercase + underscores):
//   Library/feasibility_study/
//     01_cover_page/           → main.pptx  (fixed)
//     02_table_of_contents/    → main.pptx  (fixed)
//     03_project_background/   → main.pptx  (fixed)
//     04_executive_summary/    → main.pptx  (fixed)
//     05_site_assessment/      → main.pptx  (fixed)
//     06_market_overview/      → combo.pptx (varying)
//     07_dev_recommendations_part1/ → main.pptx (fixed)
//     08_dev_recommendations_part2/ → combo.pptx (varying)
//     09_financial_analysis/   → main.pptx  (fixed)
//     10_disclaimer/           → main.pptx  (fixed)
// ──────────────────────────────────────────────────────────────────────────────
const SLIDE_MAPPING = [
    { id: 1, name: 'Cover Page', folder: '01_cover_page', vary: false, filename: 'main.pptx' },
    { id: 2, name: 'Table of Contents', folder: '02_table_of_contents', vary: false, filename: 'main.pptx' },
    { id: 3, name: 'Project Background', folder: '03_project_background', vary: false, filename: 'main.pptx' },
    { id: 4, name: 'Executive Summary', folder: '04_executive_summary', vary: false, filename: 'main.pptx' },
    { id: 5, name: 'Site Assessment', folder: '05_site_assessment', vary: false, filename: 'main.pptx' },
    { id: 6, name: 'Market Overview', folder: '06_market_overview', vary: true },
    { id: 7, name: 'Development Recommendations Part 1', folder: '07_dev_recommendations_part1', vary: false, filename: 'main.pptx' },
    { id: 8, name: 'Development Recommendations Part 2', folder: '08_dev_recommendations_part2', vary: true },
    { id: 9, name: 'Financial Analysis', folder: '09_financial_analysis', vary: false, filename: 'main.pptx' },
    { id: 10, name: 'Disclaimer', folder: '10_disclaimer', vary: false, filename: 'main.pptx' },
];

// Helper to determine Library Root for Feasibility Study
const getLibraryRoot = () => {
    let root = path.join(process.cwd(), 'Library', 'feasibility_study');
    if (!fs.existsSync(root)) {
        root = path.join(process.cwd(), '..', 'Library', 'feasibility_study');
    }
    return root;
};

/**
 * resolveSlideComponents
 *
 * Resolve the PPTX file path for a given slide slot + plot context.
 * Accepts ANY key casing in the context (City, city, 'Asset Type', assetType, etc.)
 */
export const resolveSlideComponents = (slideId, rawContext = {}) => {
    const root = getLibraryRoot();
    const config = SLIDE_MAPPING.find(s => s.id === slideId);
    if (!config) return null;

    const folderPath = path.join(root, config.folder);
    if (!fs.existsSync(folderPath)) {
        console.warn(`[MappingService] Missing folder: ${config.folder}`);
        return null;
    }

    // ── Fixed (Non-Varying) Sections ─────────────────────────
    if (!config.vary) {
        if (config.filename) {
            const specificPath = path.join(folderPath, config.filename);
            if (fs.existsSync(specificPath)) {
                return { path: specificPath, type: 'fixed', name: config.name };
            }
        }
        // Fallback: first PPTX in folder
        const files = fs.readdirSync(folderPath)
            .filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'));
        if (files.length > 0) {
            return { path: path.join(folderPath, files[0]), type: 'fixed', name: config.name };
        }
        return null;
    }

    // ── Varying Sections (Smart City + Criteria Matching) ────
    // Normalise FIRST — then build ordered search tokens
    const ctx = normalisePlotContext(rawContext);
    const tokens = buildSearchTokens(ctx);

    if (tokens.length === 0) {
        console.warn(`[MappingService] No usable criteria for section "${config.name}". Raw ctx:`, rawContext);
        return null;
    }

    const matchPath = findBestMatchFile(folderPath, tokens);
    if (matchPath) {
        return { path: matchPath, type: 'varying', name: config.name };
    }

    return null;
};

/**
 * Get the full presentation structure plan
 */
export const getPresentationPlan = () => SLIDE_MAPPING;

export default { resolveSlideComponents, getPresentationPlan };
