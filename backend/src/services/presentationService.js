import path from 'path';
import fs from 'fs';
import PptxGenJS from 'pptxgenjs';
import { Automizer, modify } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import { getCityData } from '../data/cityData.js';
import { addInvestmentAssumptionsTable, addROIAnalysisTable, addMarketAnalysisContent, addMarketOverviewContent, addSupplyAnalysisContent, addDemandDriversContent, addKeyIndicatorsContent } from '../utils/slideContentHelpers.js';
import { generateTOCTitles } from '../utils/titleGenerator.js';
import { addROIChart, addCashFlowChart, addMarketGrowthChart, addInvestmentBreakdownChart, addSupplyChart, addDemandChart, addPriceTrendsChart } from '../utils/chartGenerator.js';
import { generateInvestmentNotes, generateROINotes, generateMarketNotes, generateCashFlowNotes, generateCoverNotes } from '../utils/speakerNotesGenerator.js';
import { validateFormData } from '../utils/inputValidator.js';
import { findBestMatchFile } from '../utils/fileMatcher.js';

const log = console.log;
// AIRE Design System Colors
const COLORS = {
    NAVY: '234874',
    GOLD: 'E2A300',
    WHITE: 'FFFFFF',
    BLACK: '000000',
    GRAY: '666666',
    TEAL: '5B9AA8',
    YELLOW_LIGHT: 'FFED00'
};

// Helper: Ensure text is always a valid string for PptxGenJS
const safeText = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

// Helper to find files recursively in the Library folder
const findFileInLibrary = (filename) => {
    // Handle both cases: running from backend/ or backend/src/
    let libraryRoot = path.join(process.cwd(), 'Library');

    // If Library doesn't exist at current level, try parent directory
    if (!fs.existsSync(libraryRoot)) {
        libraryRoot = path.join(process.cwd(), '..', 'Library');
    }

    // Still not found? Log error and return null
    if (!fs.existsSync(libraryRoot)) {
        console.error(`Library folder not found at: ${libraryRoot}`);
        console.error(`Current working directory: ${process.cwd()}`);
        return null;
    }

    const find = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const found = find(fullPath);
                if (found) return found;
            } else if (file.toLowerCase() === filename.toLowerCase()) {
                return fullPath;
            }
        }
        return null;
    };

    return find(libraryRoot);
};


export const generatePresentation = async ({ presentationType, formData, plots, userId }) => {
    console.log(`🏭 GENERATE: Starting assembly for "${presentationType.name}"`);
    console.log(`   Plots: ${plots ? plots.length : 0}`);

    // 1. Initialize Automizer
    const automizer = new Automizer({
        templateDir: process.cwd(),
        outputDir: path.join(process.cwd(), 'generated')
    });

    // 1.1 Load Root Template
    let libraryRoot = path.join(process.cwd(), 'Library');
    if (!fs.existsSync(libraryRoot)) {
        libraryRoot = path.join(process.cwd(), '..', 'Library');
        if (!fs.existsSync(libraryRoot)) {
            // Fallback for when running from root without going into backend
            libraryRoot = path.join(process.cwd(), 'backend', 'Library');
        }
    }

    const rootTemplatePath = path.join(libraryRoot, 'RootTemplate.pptx');
    if (fs.existsSync(rootTemplatePath)) {
        automizer.loadRoot(rootTemplatePath);
    } else {
        console.error(`RootTemplate.pptx missing at ${rootTemplatePath}`);
        // Create a fallback root if missing to prevent crash, though user should have it
        // We can't really proceed without a root for Automizer, so we throw
        throw new Error(`RootTemplate.pptx missing at ${rootTemplatePath}`);
    }

    // 2. Define Sections (Fixed structure)
    // If presentationType has sections defined, use them. Otherwise default to Feasibility Study structure.
    let sections = presentationType.sections;
    if (!sections || sections.length === 0) {
        sections = [
            { name: '01_Cover Page', type: 'UNVARYING' },
            { name: '02_Table of Contents', type: 'UNVARYING' },
            { name: '03_Project Background', type: 'UNVARYING' },
            { name: '04_Executive Summary', type: 'UNVARYING' },
            { name: '05_Site Assessment', type: 'UNVARYING' },
            { name: '06_Market Overview', type: 'VARYING' },
            { name: '07_Development Recommendations Part 1', type: 'VARYING' },
            { name: '08_Development Recommendations Part 2', type: 'VARYING' },
            { name: '09_Development Recommendations Part 3', type: 'VARYING' },
            { name: '10_Financial & Investment Analysis', type: 'VARYING' },
            { name: '11_Disclaimer', type: 'UNVARYING' }
        ];
    }

    // 3. Build Keys for Plots
    // Key format: city + asset_type + category + specs
    const uniqueKeys = new Set();
    const plotContexts = (plots && plots.length > 0) ? plots : [formData];

    plotContexts.forEach(plot => {
        // Handle case variations and missing fields safely
        const city = (plot.city || '').toLowerCase();
        const asset = (plot.assetType || plot.asset_type || '').toLowerCase();
        const category = (plot.category || '').toLowerCase();
        const specs = (plot.specs || '').toLowerCase();

        // Only build key if we have at least city and asset
        if (city && asset) {
            // Filter out empty parts to allow flexible matching if category/specs are missing
            const parts = [city, asset, category, specs].filter(p => p);
            const key = parts.join(' + ');
            uniqueKeys.add(key);
        }
    });

    console.log(`   Generated Keys: ${Array.from(uniqueKeys).slice(0, 3)}...`);

    // 4. Iterate Sections and Fetch Files
    for (const section of sections) {
        const sectionName = section.name;
        // Handle varying vs unvarying logic
        // "VARYING" usually means it depends on the plot details (Market Overview, etc.)
        // We determine this by checking if the section name implies variability or if strictly flagged
        const isVarying = section.type === 'VARYING' || section.isVarying ||
            ['06_Market Overview', 'Supply Analysis', 'Demand Drivers'].includes(sectionName);

        const sectionDir = path.join(libraryRoot, presentationType.name, sectionName);

        if (!fs.existsSync(sectionDir)) {
            console.warn(`   ⚠️ Missing Section Folder: ${sectionDir}`);
            continue;
        }

        if (isVarying) {
            // Look for specific files for each unique key
            for (const key of uniqueKeys) {
                const filename = `${key}.pptx`;
                const filePath = path.join(sectionDir, filename);

                if (fs.existsSync(filePath)) {
                    console.log(`   ▶️ Adding Varying Slide: ${filename}`);
                    try {
                        const loadKey = `vary_${sectionName.replace(/\s/g, '')}_${uuidv4()}`;
                        automizer.load(filePath, loadKey);
                        automizer.addSlide(loadKey, 1);
                    } catch (e) {
                        console.error(`Error adding slide ${filename}:`, e.message);
                    }
                } else {
                    // SILENT SKIP as requested - no placeholder
                    // console.log(`   (Skipping missing file: ${filename})`);
                }
            }
        } else {
            // UNVARYING: Look for standard file (e.g., cover.pptx, or any single pptx)
            // Try specific name logic based on section or just take the first file
            let targetFile = null;
            if (sectionName.includes('Cover')) targetFile = 'cover.pptx';
            else if (sectionName.includes('Disclaimer')) targetFile = 'disclaimer.pptx';
            else if (sectionName.includes('Background')) targetFile = 'project_background.pptx';
            else if (sectionName.includes('Table of Contents')) targetFile = 'toc.pptx';
            else if (sectionName.includes('Executive Summary')) targetFile = 'executive_summary.pptx';
            else if (sectionName.includes('Site Assessment')) targetFile = 'site_assessment.pptx';

            // If explicit file not found, try to find ANY pptx in the folder
            if (targetFile && fs.existsSync(path.join(sectionDir, targetFile))) {
                // Found known file
            } else {
                const files = fs.readdirSync(sectionDir).filter(f => f.endsWith('.pptx'));
                if (files.length > 0) targetFile = files[0];
            }

            if (targetFile) {
                const filePath = path.join(sectionDir, targetFile);
                if (fs.existsSync(filePath)) {
                    console.log(`   ▶️ Adding Static Slide: ${targetFile}`);
                    try {
                        const loadKey = `static_${sectionName.replace(/\s/g, '')}_${uuidv4()}`;
                        automizer.load(filePath, loadKey);
                        automizer.addSlide(loadKey, 1);
                    } catch (e) {
                        console.error(`Error adding slide ${targetFile}:`, e.message);
                    }
                }
            }
        }
    }

    // 5. Output
    const runId = uuidv4();
    const finalFileName = `${(formData.title || 'Presentation').replace(/[^a-zA-Z0-9]/g, '_')}_${runId}.pptx`;
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    await automizer.write(finalFileName);

    return {
        fileName: finalFileName,
        filePath: path.join(outputDir, finalFileName),
        fileSize: 0
    };
};

/**
 * Generate Presentation using strict template matching (Assembly Mode)
 * Uses pptx-automizer to merge existing slides from Library
 */
export const generatePresentationFromTemplate = async ({ template, formData, userId }) => {
    // 1. Setup Automizer
    const automizer = new Automizer({
        templateDir: process.cwd(),
        outputDir: path.join(process.cwd(), 'generated')
    });

    // 1.1 Load Root Template (REQUIRED by Automizer)
    let libraryRoot = path.join(process.cwd(), 'Library');
    if (!fs.existsSync(libraryRoot)) libraryRoot = path.join(process.cwd(), '..', 'Library');

    const rootTemplatePath = path.join(libraryRoot, 'RootTemplate.pptx');

    if (fs.existsSync(rootTemplatePath)) {
        automizer.loadRoot(rootTemplatePath);
    } else {
        // Fallback: Create a blank presentation or handle error?
        // Automizer NEEDS a root. 
        console.warn("WARNING: RootTemplate.pptx not found in Library. Checking for alternatives...");
        // Use the first available slide as root? No, that's messy.
        // Throw error for now, as Library MUST have a root template.
        throw new Error(`RootTemplate.pptx not found at ${rootTemplatePath}. Please verify Library structure.`);
    }

    const runId = uuidv4();
    const finalFileName = `${(formData.title || template.city + '_' + template.assetType).replace(/[^a-zA-Z0-9]/g, '_')}_${runId}.pptx`;

    console.log(`🏭 TEMPLATE GENERATE: ${template.city} - ${template.assetType}`);

    // 2. Identify Metadata and Slides
    const sortedSlides = template.slides.sort((a, b) => a.order - b.order);

    // 3. Process slides
    for (const slideSlot of sortedSlides) {
        if (!slideSlot.libraryItemId || !slideSlot.libraryItemId.path) {
            console.warn(`Skipping slot ${slideSlot.sectionName}: No library item path`);
            continue;
        }

        const relativePath = slideSlot.libraryItemId.path;

        // Resolve absolute path
        let libraryRoot = path.join(process.cwd(), 'Library');
        if (!fs.existsSync(libraryRoot)) libraryRoot = path.join(process.cwd(), '..', 'Library');

        const fullPath = path.join(libraryRoot, relativePath);

        if (!fs.existsSync(fullPath)) {
            console.warn(`Skipping missing file: ${fullPath}`);
            continue;
        }

        if (fs.statSync(fullPath).isDirectory()) {
            console.warn(`Skipping folder path: ${fullPath} (Template should point to files)`);
            continue;
        }

        // Add to Automizer
        const alias = `slide_${slideSlot._id}`;
        automizer.load(fullPath, alias);

        // Assume slide 1 (standard for slide libraries)
        automizer.addSlide(alias, 1);
    }

    // 4. Write Output
    const result = await automizer.write(finalFileName);

    return {
        fileName: finalFileName,
        filePath: path.join(process.cwd(), 'generated', finalFileName),
        fileSize: 0
    };
};

/**
 * THE SYSTEM (Spotify-like Assembly Engine)
 * "Task 2: Slide assembly logic from structured folders"
 * 
 * Algorithm:
 * 1. Read Playlist Definition (PresentationType & Sections)
 * 2. Read User Input (Plots/Parameters)
 * 3. Foreach Section (Song Slot):
 *    - Determine the "key" (Filename) based on Plot Metadata.
 *    - Key = [Criterion1_Value] + [Criterion2_Value] + ... .pptx
 *    - Pull that exact file from the Section Folder (Album).
 * 4. Merge into Master Playlist.
 */
export const assemblePresentation = async ({ presentationType, formData, plots, userId }) => {
    console.log(`\n🏭 SYSTEM: Starting Assembly for "${presentationType.name}"`);
    console.log(`   Plots (Contexts): ${plots ? plots.length : 0}`);

    // 1. Initialize Automizer
    const automizer = new Automizer({
        templateDir: process.cwd(),
        outputDir: path.join(process.cwd(), 'generated'),
        removeExistingSlides: true
    });

    // 1.1 Load Root Template
    let libraryRoot = path.join(process.cwd(), 'Library');
    if (!fs.existsSync(libraryRoot)) {
        libraryRoot = path.join(process.cwd(), '..', 'Library');
    }

    const rootTemplatePath = path.join(libraryRoot, 'RootTemplate.pptx');
    if (fs.existsSync(rootTemplatePath)) {
        automizer.loadRoot(rootTemplatePath);
    } else {
        console.error(`CRITICAL: RootTemplate.pptx missing at ${rootTemplatePath}`);
        throw new Error(`SYSTEM ERROR: RootTemplate.pptx missing at ${rootTemplatePath}`);
    }

    // 2. Normalize Plots Data
    // Ensure we have an array of data objects.
    // If 'plots' is provided (Multi-Plot), use it.
    // If not, use 'formData' as a single context (Single-Site).
    let plotContexts = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];

    // Validate contexts to ensure they have minimal data
    plotContexts = plotContexts.filter(ctx => ctx && Object.keys(ctx).length > 0);

    // 3. Iterate Sections (The Playlist)
    // defined in the database (or seed)
    const sections = (presentationType.sections || []).sort((a, b) => a.order - b.order);

    if (sections.length === 0) {
        throw new Error("Presentation Type has no sections defined. Cannot assemble.");
    }

    for (const section of sections) {
        console.log(`\n🎵 Processing Section: "${section.name}" (${section.isVarying ? 'Varying' : 'Fixed'})`);

        // Locate Album (Folder)
        const typeFolderName = presentationType.name;
        const sectionFolderName = section.folderPath || section.name;
        const sectionDir = path.join(libraryRoot, typeFolderName, sectionFolderName);

        if (!fs.existsSync(sectionDir)) {
            console.warn(`   ⚠️ MISSING ALBUM: Folder not found at ${sectionDir}`);
            continue;
        }

        // --- UNVARYING SECTIONS ---
        // Added ONCE, regardless of how many plots there are.
        if (!section.isVarying) {
            // Find "Best" unvarying file. usually just the first one or specific name.
            const files = fs.readdirSync(sectionDir).filter(f => f.endsWith('.pptx') && !f.startsWith('~$'));

            if (files.length > 0) {
                // Heuristic: specific names or first available
                let targetFile = files.find(f => f.toLowerCase().includes('cover')) ||
                    files.find(f => f.toLowerCase().includes('toc')) ||
                    files[0];

                const filePath = path.join(sectionDir, targetFile);
                if (fs.statSync(filePath).size > 0) {
                    console.log(`   ▶️ Adding Static Track: "${targetFile}"`);
                    try {
                        const loadKey = `static_${section.order}_${uuidv4()}`;
                        automizer.load(filePath, loadKey);
                        // Add slide (with simple replacer for global data like Project Title)
                        automizer.addSlide(loadKey, 1, (slide) => {
                            slide.modify(createStaticReplacer(formData));
                        });
                    } catch (err) {
                        console.error(`   ❌ ERROR Adding Static Track:`, err.message);
                    }
                }
            } else {
                console.warn(`   ⚠️ Empty Section Folder: ${section.name}`);
            }
        }

        // --- VARYING SECTIONS ---
        // Added PER UNIQUE CRITERIA SET (Deduplicated)
        else {
            const addedFilesForSection = new Set(); // Track filenames added for this section to prevent duplicates

            // Determine which criteria matter for this section
            // e.g. Market Overview varies by [City], but maybe not by [Specifications]
            const relevantCriteriaNames = (section.varyingCriteria && section.varyingCriteria.length > 0)
                ? section.varyingCriteria
                : presentationType.criteria.map(c => c.name); // Fallback: Use all criteria

            for (const context of plotContexts) {
                // 1. Build Search Tokens based on Relevant Criteria
                const searchTokens = [];
                for (const critName of relevantCriteriaNames) {
                    // Find matching key in context (case-insensitive)
                    const key = Object.keys(context).find(k => k.toLowerCase() === critName.toLowerCase());
                    if (key && context[key]) {
                        searchTokens.push(context[key]);
                    }
                }

                if (searchTokens.length === 0) {
                    // If no relevant criteria found in this plot, maybe skip or use 'Default'?
                    // Just skip to be safe.
                    continue;
                }

                // 2. Find File using Robust Matcher
                const bestFilePath = findBestMatchFile(sectionDir, searchTokens);

                if (!bestFilePath) {
                    // Logic: If file missing, SILENTLY SKIP as requested (no placeholders)
                    console.log(`   (Skipping: No match for [${searchTokens.join(', ')}])`);
                    continue;
                }

                const filename = path.basename(bestFilePath);

                // 3. Deduplication
                // If we already added "Dubai Market Overview.pptx" for this section, don't add it again.
                // Even if Plot 1 is Dubai Res and Plot 2 is Dubai Comm, if the file found is just "Dubai.pptx", it's the same file.
                if (addedFilesForSection.has(filename)) {
                    continue;
                }

                // 4. Add the Slide
                if (fs.existsSync(bestFilePath)) {
                    console.log(`   ▶️ Adding Varying Track: "${filename}" (matched: ${searchTokens.join('+')})`);
                    addedFilesForSection.add(filename);

                    try {
                        const loadKey = `vary_${section.order}_${filename.replace(/[^a-z0-9]/gi, '_')}_${uuidv4()}`;
                        automizer.load(bestFilePath, loadKey);

                        // We replace data using THIS context (Plot specific)
                        automizer.addSlide(loadKey, 1, (slide) => {
                            slide.modify(createStaticReplacer(context));
                        });
                    } catch (err) {
                        console.error(`   ❌ ERROR Adding Varying Track:`, err.message);
                    }
                }
            }
        }
    }

    // 4. Produce Record (Output)
    const runId = uuidv4();
    const finalFileName = `${(formData.title || formData.projectTitle || 'Presentation').replace(/[^a-zA-Z0-9]/g, '_')}_${runId}.pptx`;

    let outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(path.join(process.cwd(), 'Library'))) {
        outputDir = path.join(process.cwd(), '..', 'generated');
    }
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    await automizer.write(finalFileName);

    console.log(`\n✅ SYSTEM: Assembly Complete.`);
    console.log(`   Output: ${finalFileName}`);

    return {
        fileName: finalFileName,
        filePath: path.join(outputDir, finalFileName),
        fileSize: 0
    };
};

// Helper: Simple XML Replacer for Static/Assembly Mode
const createStaticReplacer = (dataContext) => {
    return (xml) => {
        if (typeof xml !== 'string') return xml;
        let modifiedXml = xml;
        if (!dataContext) return modifiedXml;

        Object.keys(dataContext).forEach(key => {
            const val = safeText(dataContext[key]);
            const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Regex to match {{ Key }} or {{Key}} case-insensitive
            const regex = new RegExp(`{{\\s*${safeKey}\\s*}}`, 'gi');
            modifiedXml = modifiedXml.replace(regex, val);
        });
        return modifiedXml;
    };
};
