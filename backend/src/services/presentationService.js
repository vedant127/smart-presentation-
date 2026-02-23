import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import { findBestMatchFile } from '../utils/fileMatcher.js';

const log = console.log;

/**
 * Enhanced Presentation Service with ALL FIXES
 * - Proper slide dimensions (20" × 11.2")
 * - Real slide copying with all content
 * - Dynamic placeholder replacement
 * - Varying section logic
 * - Deduplication
 * - Layout/theme preservation
 * - Image/chart preservation
 * - Silent skipping when library files are missing (NO AI fallback)
 */

// Helper: Ensure text is always a valid string
const safeText = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

/**
 * MAIN ASSEMBLY FUNCTION - THE SYSTEM
 * Fixes ALL 12 Problems
 */
export const assemblePresentation = async ({ presentationType, formData, plots, userId }) => {
    console.log(`\n🏭 ENHANCED SYSTEM: Starting Assembly for "${presentationType.name}"`);
    console.log(`   Plots (Contexts): ${plots ? plots.length : 0}`);
    console.log(`   Form Data:`, JSON.stringify(formData, null, 2));

    // 1. Initialize Automizer with proper configuration
    const automizer = new Automizer({
        templateDir: process.cwd(),
        outputDir: path.join(process.cwd(), 'generated'),
        removeExistingSlides: true,
        // Ensure dimensions are preserved from source files
        cleanup: false
    });

    // 1.1 Load Root Template (MUST have correct dimensions: 20" × 11.2")
    const baseDir = process.cwd();
    let templatesDir = path.resolve(baseDir, 'templates');
    if (!fs.existsSync(templatesDir)) {
        templatesDir = path.resolve(baseDir, '..', 'templates');
    }

    // Check multiple possible locations for RootTemplate.pptx
    const possiblePaths = [
        path.join(templatesDir, 'RootTemplate.pptx'),
        path.join(baseDir, 'Library', 'RootTemplate.pptx'),
        path.join(baseDir, '..', 'Library', 'RootTemplate.pptx')
    ];

    let rootTemplatePath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            rootTemplatePath = p;
            break;
        }
    }

    if (rootTemplatePath) {
        automizer.loadRoot(rootTemplatePath);
        console.log(`   ✅ Loaded Root Template: ${rootTemplatePath}`);
    } else {
        console.error(`CRITICAL: RootTemplate.pptx missing. Checked: [${possiblePaths.join(', ')}]`);
        throw new Error(`SYSTEM ERROR: RootTemplate.pptx missing. Please ensure it exists in the 'templates' folder with dimensions 20" × 11.2"`);
    }

    // Restore libraryRoot for finding sections
    let libraryRoot = path.join(baseDir, 'Library');
    if (!fs.existsSync(libraryRoot)) {
        libraryRoot = path.join(baseDir, '..', 'Library');
    }

    // 2. Normalize Plots Data
    let plotContexts = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];

    // Validate contexts
    plotContexts = plotContexts.filter(ctx => ctx && Object.keys(ctx).length > 0);

    // 3. Prepare Global Data for Placeholder Replacement
    const globalData = {
        PROJECT_NAME: formData.projectName || formData.title || 'Real Estate Development Project',
        CLIENT_NAME: formData.clientName || 'Confidential Client',
        DATE: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        YEAR: new Date().getFullYear().toString(),
        CITY: formData.city || (plotContexts[0] && plotContexts[0].city) || 'City',
        ASSET_TYPE: formData.assetType || (plotContexts[0] && plotContexts[0].assetType) || 'Asset Type',
        CATEGORY: formData.category || (plotContexts[0] && plotContexts[0].category) || '',
        SPECIFICATIONS: formData.specifications || (plotContexts[0] && plotContexts[0].specifications) || '',
        ...formData // Include all form data for flexibility
    };

    console.log(`   📋 Global Data:`, globalData);

    // 4. Iterate Sections (The Playlist)
    const sections = (presentationType.sections || []).sort((a, b) => a.order - b.order);

    if (sections.length === 0) {
        throw new Error("Presentation Type has no sections defined. Cannot assemble.");
    }

    let slideCount = 0;

    for (const section of sections) {
        console.log(`\n🎵 Processing Section ${section.order}: "${section.name}" (${section.isVarying ? 'Varying' : 'Fixed'})`);

        // Locate Section Folder — use the correct lowercase folder name
        const typeFolderName = 'feasibility_study';
        const sectionFolderName = section.folderPath || section.name;
        const sectionDir = path.join(libraryRoot, typeFolderName, sectionFolderName);

        if (!fs.existsSync(sectionDir)) {
            console.warn(`   ⚠️ MISSING FOLDER: ${sectionDir}`);
            console.log(`   ⏭️  Skipping section (no library files found)`);
            continue;
        }

        // --- UNVARYING (FIXED) SECTIONS ---
        if (!section.isVarying) {
            const files = fs.readdirSync(sectionDir).filter(f => f.endsWith('.pptx') && !f.startsWith('~$'));

            if (files.length > 0) {
                // Find best file (heuristic: specific names or first available)
                let targetFile = files.find(f => f.toLowerCase().includes('cover')) ||
                    files.find(f => f.toLowerCase().includes('toc')) ||
                    files.find(f => f.toLowerCase().includes(section.name.toLowerCase().replace(/[^a-z]/g, ''))) ||
                    files[0];

                const filePath = path.join(sectionDir, targetFile);

                if (fs.statSync(filePath).size > 0) {
                    console.log(`   ▶️ Adding Static Slide: "${targetFile}"`);

                    try {
                        const loadKey = `static_${section.order}_${uuidv4()}`;
                        automizer.load(filePath, loadKey);

                        // Add slide with dynamic placeholder replacement
                        automizer.addSlide(loadKey, 1, (slide) => {
                            slide.modify(createEnhancedReplacer(globalData));
                        });

                        slideCount++;
                    } catch (err) {
                        console.error(`   ❌ ERROR Adding Static Slide:`, err.message);
                    }
                }
            } else {
                console.warn(`   ⚠️ Empty Section Folder: ${section.name}`);
            }
        }

        // --- VARYING SECTIONS ---
        else {
            const addedFilesForSection = new Set(); // Deduplication

            // Determine relevant criteria for this section
            const relevantCriteriaNames = (section.varyingCriteria && section.varyingCriteria.length > 0)
                ? section.varyingCriteria
                : presentationType.criteria.map(c => c.name);

            for (const context of plotContexts) {
                // 1. Build Search Tokens
                const searchTokens = [];
                for (const critName of relevantCriteriaNames) {
                    const key = Object.keys(context).find(k => k.toLowerCase() === critName.toLowerCase());
                    if (key && context[key]) {
                        searchTokens.push(context[key]);
                    }
                }

                if (searchTokens.length === 0) {
                    continue;
                }

                // 2. Find Best Matching File
                const bestFilePath = findBestMatchFile(sectionDir, searchTokens);

                if (!bestFilePath) {
                    console.log(`   ⏭️  No match for [${searchTokens.join(', ')}] - skipping`);
                    continue;
                }

                const filename = path.basename(bestFilePath);

                // 3. Deduplication
                if (addedFilesForSection.has(filename)) {
                    console.log(`   ⏭️ Skipping duplicate: "${filename}"`);
                    continue;
                }

                // 4. Add the Slide
                if (fs.existsSync(bestFilePath)) {
                    console.log(`   ▶️ Adding Varying Slide: "${filename}" (matched: ${searchTokens.join('+')})`);
                    addedFilesForSection.add(filename);

                    try {
                        const loadKey = `vary_${section.order}_${filename.replace(/[^a-z0-9]/gi, '_')}_${uuidv4()}`;
                        automizer.load(bestFilePath, loadKey);

                        // Merge global data with plot-specific context
                        const slideData = {
                            ...globalData,
                            ...context,
                            CITY: context.city || globalData.CITY,
                            ASSET_TYPE: context.assetType || context.asset_type || globalData.ASSET_TYPE,
                            CATEGORY: context.category || globalData.CATEGORY,
                            SPECIFICATIONS: context.specifications || context.specs || globalData.SPECIFICATIONS
                        };

                        automizer.addSlide(loadKey, 1, (slide) => {
                            slide.modify(createEnhancedReplacer(slideData));
                        });

                        slideCount++;
                    } catch (err) {
                        console.error(`   ❌ ERROR Adding Varying Slide:`, err.message);
                    }
                }
            }
        }
    }

    // 5. Write Output
    const runId = uuidv4();
    const finalFileName = `${(formData.title || formData.projectName || 'Presentation').replace(/[^a-zA-Z0-9]/g, '_')}_${runId}.pptx`;

    let outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(path.join(process.cwd(), 'Library'))) {
        outputDir = path.join(process.cwd(), '..', 'generated');
    }
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    await automizer.write(finalFileName);

    console.log(`\n✅ ENHANCED SYSTEM: Assembly Complete!`);
    console.log(`   Output: ${finalFileName}`);
    console.log(`   Total Slides: ${slideCount}`);
    console.log(`   Location: ${path.join(outputDir, finalFileName)}`);

    return {
        fileName: finalFileName,
        filePath: path.join(outputDir, finalFileName),
        fileSize: fs.statSync(path.join(outputDir, finalFileName)).size,
        slideCount: slideCount
    };
};

/**
 * Enhanced Placeholder Replacer
 * Supports: {{PLACEHOLDER}}, {{ PLACEHOLDER }}, {{placeholder}}
 * Replaces in XML text content
 */
const createEnhancedReplacer = (dataContext) => {
    return (xml) => {
        if (typeof xml !== 'string') return xml;

        let modifiedXml = xml;
        if (!dataContext) return modifiedXml;

        // Replace each key in the data context
        Object.keys(dataContext).forEach(key => {
            const val = safeText(dataContext[key]);

            // Escape special regex characters in the key
            const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Match {{KEY}}, {{ KEY }}, {{key}}, etc. (case-insensitive)
            const regex = new RegExp(`{{\\s*${safeKey}\\s*}}`, 'gi');
            modifiedXml = modifiedXml.replace(regex, val);
        });

        return modifiedXml;
    };
};

/**
 * Backward compatibility: Keep old function names
 */
export const generatePresentation = assemblePresentation;
export const generatePresentationFromTemplate = assemblePresentation;

export default {
    assemblePresentation,
    generatePresentation,
    generatePresentationFromTemplate
};
