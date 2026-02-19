
import path from 'path';
import fs from 'fs';
import { findBestMatchFile } from '../utils/fileMatcher.js';

// Configuration of the 11-Slide Structure
// Maps logical Slide Number (1-11) to Library Folder and behavior
const SLIDE_MAPPING = [
    { id: 1, name: 'Cover Page', folder: '01_Cover Page', vary: false },
    { id: 2, name: 'Executive Summary', folder: '04_Executive Summary', vary: false }, // Note: Folder 04 maps to Slide 2
    { id: 3, name: 'Site Assessment', folder: '05_Site Assessment', vary: false },
    { id: 4, name: 'Market Overview', folder: '06_Market Overview', vary: true, dynamic: true },
    { id: 5, name: 'Market Indicators', folder: '06_Market Overview', vary: true, dynamic: true, fallback: true }, // May come from same file as 4?
    { id: 6, name: 'Market Outlook', folder: '06_Market Overview', vary: true, dynamic: true, fallback: true },
    { id: 7, name: 'Development Recommendations', folder: '07_Development Recommendations Part 1', vary: false }, // Fixed generic?
    { id: 8, name: 'Development Brief', folder: '08_Development Recommendations Part 2', vary: true }, // Specific to plot
    { id: 9, name: 'Financial Assumptions', folder: '10_Financial & Investment Analysis', vary: false },
    { id: 10, name: 'Financial Results', folder: '10_Financial & Investment Analysis', vary: false },
    { id: 11, name: 'Sensitivity / Returns', folder: '10_Financial & Investment Analysis', vary: false } // Assuming multiple slides in folder 10
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
        console.warn(`[MappingService] Missing folder: ${config.folder}`);
        return null;
    }

    // 1. Non-Varying (Fixed) Sections
    if (!config.vary) {
        // Just take the first PPTX found
        const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'));
        if (files.length === 0) return null;
        return {
            path: path.join(folderPath, files[0]),
            type: 'fixed',
            name: config.name
        };
    }

    // 2. Varying Sections (Smart Match)
    // Build check tokens from Context
    const criteria = [
        context.city,
        context.assetType,
        context.category,
        context.specifications
    ].filter(Boolean);

    // Use the robust FileMatcher to find the best file
    const matchPath = findBestMatchFile(folderPath, criteria);

    if (matchPath) {
        return {
            path: matchPath,
            type: 'varying',
            name: config.name,
            score: 1 // Found specific
        };
    }

    console.log(`[MappingService] No match for Slot ${slideId} (${config.name}) with criteria: ${criteria.join(', ')}`);
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
