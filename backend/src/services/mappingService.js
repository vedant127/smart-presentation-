import path from 'path';
import fs from 'fs';
import { findBestMatchFile } from '../utils/fileMatcher.js';

// Configuration of the 11-Section Structure (STRICT PHASE 1)
// Maps logical Section Number (1-11) to Library Folder and behavior
const SLIDE_MAPPING = [
    { id: 1, name: 'Cover Page', folder: '01_Cover Page', vary: false, filename: 'cover.pptx' },
    { id: 2, name: 'Table of Contents', folder: '02_Table of Contents', vary: false, filename: 'toc.pptx' },
    { id: 3, name: 'Project Background', folder: '03_Project Background', vary: false, filename: 'project_background.pptx' },
    { id: 4, name: 'Executive Summary', folder: '04_Executive Summary', vary: false, filename: 'executive_summary.pptx' },
    { id: 5, name: 'Site Assessment', folder: '05_Site Assessment', vary: false, filename: 'site_assessment.pptx' },
    { id: 6, name: 'Market Overview', folder: '06_Market Overview', vary: true },
    { id: 7, name: 'Development Recommendations Part 1', folder: '07_Development Recommendations Part 1', vary: false, filename: 'development recommendations PART 1.pptx' },
    { id: 8, name: 'Development Recommendations Part 2', folder: '08_Development Recommendations Part 2', vary: true },
    { id: 9, name: 'Development Recommendations Part 3', folder: '09_Development Recommendations Part 3', vary: false, filename: 'development recommendations PART 3.pptx' },
    { id: 10, name: 'Financial & Investment Analysis', folder: '10_Financial & Investment Analysis', vary: false, filename: 'financial and investment analysis.pptx' },
    { id: 11, name: 'Disclaimer', folder: '11_Disclaimer', vary: false, filename: 'disclaimer.pptx' }
];

// Helper to determine Library Root
const getLibraryRoot = () => {
    let root = path.join(process.cwd(), 'Library', 'Feasibility Study');
    if (!fs.existsSync(root)) {
        root = path.join(process.cwd(), '..', 'Library', 'Feasibility Study');
    }
    return root;
};

/**
 * Resolve the file path for a specific slide slot given the context.
 * Returns { path: string, type: 'fixed' | 'varying' }
 */
export const resolveSlideComponents = (slideId, context = {}) => {
    const root = getLibraryRoot();
    const config = SLIDE_MAPPING.find(s => s.id === slideId);

    if (!config) return null;

    const folderPath = path.join(root, config.folder);
    if (!fs.existsSync(folderPath)) {
        console.warn(`[MappingService] Missing folder: ${config.folder} at ${folderPath}`);
        return null;
    }

    // 1. Fixed (Non-Varying) Sections
    if (!config.vary) {
        // If a specific filename is defined, try to use it
        if (config.filename) {
            const specificPath = path.join(folderPath, config.filename);
            if (fs.existsSync(specificPath)) {
                return { path: specificPath, type: 'fixed', name: config.name };
            }
        }

        // Fallback: Pick the first PPTX in the folder
        const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'));
        if (files.length > 0) {
            return { path: path.join(folderPath, files[0]), type: 'fixed', name: config.name };
        }
        return null;
    }

    // 2. Varying Sections (Smart Selection based on City + Criteria)
    const criteria = [
        context.city || context.City,
        context.assetType || context.AssetType,
        context.category || context.Category,
        context.specifications || context.Specifications
    ].filter(Boolean);

    // Use the robust FileMatcher to find the best matching file in the library folder
    const matchPath = findBestMatchFile(folderPath, criteria);

    if (matchPath) {
        return {
            path: matchPath,
            type: 'varying',
            name: config.name
        };
    }

    return null;
};

/**
 * Get the full presentation structure plan
 */
export const getPresentationPlan = () => {
    return SLIDE_MAPPING;
};

export default {
    resolveSlideComponents,
    getPresentationPlan
};


