import path from 'path';
import fs from 'fs';

// ══════════════════════════════════════════════════════════════════════════════
//  MAPPING SERVICE
//
//  Defines the 10-section structure for Feasibility Study.
//  NO number prefixes. NO AI. Clean folder names.
//
//  Library/feasibility_study/
//    cover_page/main.pptx                          ← fixed
//    table_of_contents/main.pptx                   ← fixed
//    project_background/main.pptx                  ← fixed
//    executive_summary/main.pptx                   ← fixed
//    site_assessment/main.pptx                     ← fixed
//    market_overview/{plotkey}.pptx                 ← varying
//    dev_recommendations_part1/main.pptx           ← fixed
//    dev_recommendations_part2/{plotkey}.pptx       ← varying
//    financial_investment_analysis/main.pptx        ← fixed
//    disclaimer/main.pptx                          ← fixed
// ══════════════════════════════════════════════════════════════════════════════

const SLIDE_MAPPING = [
    { id: 1, name: 'Cover Page', folder: 'cover_page', vary: false, filename: 'main.pptx' },
    { id: 2, name: 'Table of Contents', folder: 'table_of_contents', vary: false, filename: 'main.pptx' },
    { id: 3, name: 'Project Background', folder: 'project_background', vary: false, filename: 'main.pptx' },
    { id: 4, name: 'Executive Summary', folder: 'executive_summary', vary: false, filename: 'main.pptx' },
    { id: 5, name: 'Site Assessment', folder: 'site_assessment', vary: false, filename: 'main.pptx' },
    { id: 6, name: 'Market Overview', folder: 'market_overview', vary: true },
    { id: 7, name: 'Dev Recommendations Part 1', folder: 'dev_recommendations_part1', vary: false, filename: 'main.pptx' },
    { id: 8, name: 'Dev Recommendations Part 2', folder: 'dev_recommendations_part2', vary: true },
    { id: 9, name: 'Financial & Investment Analysis', folder: 'financial_investment_analysis', vary: false, filename: 'main.pptx' },
    { id: 10, name: 'Disclaimer', folder: 'disclaimer', vary: false, filename: 'main.pptx' },
];

function getLibraryRoot() {
    const cwd = process.cwd();
    let root = path.join(cwd, 'Library', 'feasibility_study');
    if (!fs.existsSync(root)) root = path.join(cwd, '..', 'Library', 'feasibility_study');
    return root;
}

// Plot key: converts plot data to filename
function makePlotKey(plot) {
    return [
        plot.city || plot.City || '',
        plot.assetType || plot['Asset Type'] || plot.asset_type || '',
        plot.category || plot.Category || '',
        plot.specs || plot.specifications || plot.Specifications || '',
    ]
        .join('_')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

export const resolveSlideComponents = (slideId, plotData = {}) => {
    const root = getLibraryRoot();
    const config = SLIDE_MAPPING.find(s => s.id === slideId);
    if (!config) return null;

    const folderPath = path.join(root, config.folder);
    if (!fs.existsSync(folderPath)) return null;

    // Fixed section
    if (!config.vary) {
        const filePath = path.join(folderPath, config.filename);
        if (fs.existsSync(filePath)) {
            return { path: filePath, type: 'fixed', name: config.name };
        }
        return null;
    }

    // Varying section — use plot key to find file
    const key = makePlotKey(plotData);
    if (!key) return null;

    const filePath = path.join(folderPath, `${key}.pptx`);
    if (fs.existsSync(filePath)) {
        return { path: filePath, type: 'varying', name: config.name };
    }

    console.warn(`[MappingService] File not found: ${key}.pptx in ${config.folder}/`);
    return null;
};

export const getPresentationPlan = () => SLIDE_MAPPING;
export { makePlotKey };

export default { resolveSlideComponents, getPresentationPlan, makePlotKey };
