import path from 'path';
import fs from 'fs';

// ══════════════════════════════════════════════════════════════════════════════
//  MAPPING SERVICE (v3)
//
//  Defines the 11-section structure for Feasibility Study.
//  Uses numbered folder prefixes + exact filenames.
//
//  Library/Feasibility Study/
//    01_Cover Page/cover.pptx                                          ← fixed
//    02_Table of Contents/toc.pptx                                     ← fixed
//    03_Project Background/project_background.pptx                     ← fixed
//    04_Executive Summary/executive_summary.pptx                       ← fixed
//    05_Site Assessment/site_assessment.pptx                            ← fixed
//    06_Market Overview/{city + assetType + category + specs}.pptx      ← varying
//    07_Development Recommendations Part 1/devrec_part1.pptx           ← fixed
//    08_Development Recommendations Part 2/{city + assetType + ...}.pptx ← varying
//    09_Development Recommendations Part 3/devrec_part3.pptx           ← fixed
//    10_Financial & Investment Analysis/financial_investment_analysis.pptx ← fixed
//    11_Disclaimer/disclaimer.pptx                                     ← fixed
// ══════════════════════════════════════════════════════════════════════════════

const SLIDE_MAPPING = [
    { id: 1, name: 'Cover Page', folder: '01_Cover Page', vary: false, filename: 'cover.pptx' },
    { id: 2, name: 'Table of Contents', folder: '02_Table of Contents', vary: false, filename: 'toc.pptx' },
    { id: 3, name: 'Project Background', folder: '03_Project Background', vary: false, filename: 'project_background.pptx' },
    { id: 4, name: 'Executive Summary', folder: '04_Executive Summary', vary: false, filename: 'executive_summary.pptx' },
    { id: 5, name: 'Site Assessment', folder: '05_Site Assessment', vary: false, filename: 'site_assessment.pptx' },
    { id: 6, name: 'Market Overview', folder: '06_Market Overview', vary: true },
    { id: 7, name: 'Dev Recommendations Part 1', folder: '07_Development Recommendations Part 1', vary: false, filename: 'devrec_part1.pptx' },
    { id: 8, name: 'Dev Recommendations Part 2', folder: '08_Development Recommendations Part 2', vary: true },
    { id: 9, name: 'Dev Recommendations Part 3', folder: '09_Development Recommendations Part 3', vary: false, filename: 'devrec_part3.pptx' },
    { id: 10, name: 'Financial & Investment Analysis', folder: '10_Financial & Investment Analysis', vary: false, filename: 'financial_investment_analysis.pptx' },
    { id: 11, name: 'Disclaimer', folder: '11_Disclaimer', vary: false, filename: 'disclaimer.pptx' },
];

function getLibraryRoot() {
    const cwd = process.cwd();
    let root = path.join(cwd, 'Library', 'Feasibility Study');
    if (fs.existsSync(root)) return root;
    root = path.join(cwd, '..', 'Library', 'Feasibility Study');
    if (fs.existsSync(root)) return root;
    // Fallback to old structure
    root = path.join(cwd, 'Library', 'feasibility_study');
    if (!fs.existsSync(root)) root = path.join(cwd, '..', 'Library', 'feasibility_study');
    return root;
}

// Plot key: "city + assetType + category + specs" all lowercase
function makePlotKey(plot) {
    return [
        plot.city || plot.City || '',
        plot.assetType || plot['Asset Type'] || plot.asset_type || '',
        plot.category || plot.Category || '',
        plot.specs || plot.specifications || plot.Specifications || '',
    ]
        .map(s => s.trim())
        .join(' + ')
        .toLowerCase();
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
