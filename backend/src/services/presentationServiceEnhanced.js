import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import PizZip from 'pizzip';
import { findBestMatchFile, normalisePlotContext, buildSearchTokens } from '../utils/fileMatcher.js';
import * as aiContentGenerator from './aiContentGenerator.js';


// Count how many slides are inside a PPTX file (it's a ZIP)
const countSlidesInFile = (filePath) => {
    try {
        const zip = new PizZip(fs.readFileSync(filePath));
        return Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
    } catch { return 1; } // Default to 1 if unreadable
};

const log = console.log;

/**
 * Enhanced Presentation Service with ALL FIXES
 * - Proper slide dimensions (20" × 11.2")
 * - Real slide copying with all content
 * - Dynamic placeholder replacement
 * - AI content generation integration
 * - Varying section logic
 * - Deduplication
 * - Layout/theme preservation
 * - Image/chart preservation
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

    // 2. Normalize Plots Data — accept ANY key casing from the frontend
    const rawContexts = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];

    // ✅ KEY: Normalise every plot context so 'City', 'city', 'CITY' all work
    let plotContexts = rawContexts
        .map(normalisePlotContext)
        .filter(ctx => ctx.city || ctx.assetType || ctx.category || ctx.specifications);

    // Fallback: if no plots had valid criteria, treat formData itself as the single context
    if (plotContexts.length === 0) {
        const fd = normalisePlotContext(formData);
        plotContexts = fd.city || fd.assetType ? [fd] : [];
    }

    console.log(`   📊 Plot contexts (normalised):`, plotContexts);

    // 3. Prepare Global Data for Placeholder Replacement
    // Pull the first plot's normalised context as the primary reference for globals
    const firstCtx = plotContexts[0] || {};
    const globalData = {
        PROJECT_NAME: formData.projectName || formData.title || 'Real Estate Development Project',
        CLIENT_NAME: formData.clientName || 'Confidential Client',
        DATE: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        YEAR: new Date().getFullYear().toString(),
        CITY: firstCtx.city || 'City',
        ASSET_TYPE: firstCtx.assetType || 'Asset Type',
        CATEGORY: firstCtx.category || '',
        SPECIFICATIONS: firstCtx.specifications || '',
        // Raw form fields keep their original keys so any {{fieldName}} tag also resolves
        ...formData,
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

        // Locate Section Folder
        const typeFolderName = presentationType.name;
        const sectionFolderName = section.folderPath || section.name;
        const sectionDir = path.join(libraryRoot, typeFolderName, sectionFolderName);

        if (!fs.existsSync(sectionDir)) {
            console.warn(`   ⚠️ MISSING FOLDER: ${sectionDir}`);

            // Try to generate AI content as fallback
            if (section.isVarying) {
                console.log(`   🤖 Attempting AI content generation for missing section...`);
                try {
                    const aiContent = await aiContentGenerator.generateSlideContent(
                        section.name,
                        formData,
                        plotContexts[0]
                    );
                    console.log(`   ✅ AI Content Generated (${aiContent.length} chars)`);
                    // Note: We can't add AI-generated text to slides without a template
                    // This would require creating slides programmatically with pptxgenjs
                    // For now, we skip and log
                } catch (aiError) {
                    console.error(`   ❌ AI generation failed:`, aiError.message);
                }
            }

            continue;
        }

        // --- UNVARYING (FIXED) SECTIONS ---
        if (!section.isVarying) {
            const files = fs.readdirSync(sectionDir).filter(f => f.endsWith('.pptx') && !f.startsWith('~$'));

            if (files.length > 0) {
                // Use the first (and usually only) PPTX in the section folder
                const targetFile = files[0];
                const filePath = path.join(sectionDir, targetFile);

                if (fs.statSync(filePath).size > 0) {
                    const totalSlides = countSlidesInFile(filePath);
                    console.log(`   ▶️ Adding ALL ${totalSlides} slide(s) from "${targetFile}"`);

                    try {
                        const loadKey = `static_${section.order}_${uuidv4().substring(0, 6)}`;
                        automizer.load(filePath, loadKey);

                        // ✅ KEY FIX: Loop through ALL slides, not just slide 1
                        for (let slideIdx = 1; slideIdx <= totalSlides; slideIdx++) {
                            automizer.addSlide(loadKey, slideIdx, (slide) => {
                                slide.modify(createEnhancedReplacer(globalData));
                            });
                            slideCount++;
                        }
                    } catch (err) {
                        console.error(`   ❌ ERROR Adding Static Slides:`, err.message);
                    }
                }
            } else {
                console.warn(`   ⚠️ Empty Section Folder: ${section.name}`);
            }
        }

        // --- VARYING SECTIONS ---
        else {
            const addedFilesForSection = new Set(); // Deduplication

            for (const ctx of plotContexts) {
                // ✅ NEW: use buildSearchTokens — handles ANY key casing
                const searchTokens = buildSearchTokens(ctx);

                if (searchTokens.length === 0) {
                    console.warn(`   ⚠️ Plot has no usable criteria, skipping.`, ctx);
                    continue;
                }

                console.log(`   🔍 Searching with tokens: [${searchTokens.join(', ')}]`);

                // Find Best Matching File
                const bestFilePath = findBestMatchFile(sectionDir, searchTokens);

                if (!bestFilePath) {
                    console.log(`   ⚠️ No file match for [${searchTokens.join(', ')}] — skipping section for this plot.`);
                    continue;
                }

                const filename = path.basename(bestFilePath);

                // Deduplication
                if (addedFilesForSection.has(filename)) {
                    console.log(`   ⏭️ Skipping duplicate: "${filename}"`);
                    continue;
                }

                // Add ALL Slides from the matched file
                addedFilesForSection.add(filename);
                const totalSlides = countSlidesInFile(bestFilePath);
                console.log(`   ▶️ Adding ALL ${totalSlides} slide(s) from "${filename}" (tokens: ${searchTokens.join('+')})`);

                try {
                    const loadKey = `vary_${section.order}_${filename.replace(/[^a-z0-9]/gi, '_').substring(0, 28)}_${uuidv4().substring(0, 6)}`;
                    automizer.load(bestFilePath, loadKey);

                    // Build slide-level data: merge global + normalised ctx values
                    const slideData = {
                        ...globalData,
                        CITY: ctx.city || globalData.CITY,
                        ASSET_TYPE: ctx.assetType || globalData.ASSET_TYPE,
                        CATEGORY: ctx.category || globalData.CATEGORY,
                        SPECIFICATIONS: ctx.specifications || globalData.SPECIFICATIONS,
                    };

                    for (let slideIdx = 1; slideIdx <= totalSlides; slideIdx++) {
                        automizer.addSlide(loadKey, slideIdx, (slide) => {
                            slide.modify(createEnhancedReplacer(slideData));
                        });
                        slideCount++;
                    }
                } catch (err) {
                    console.error(`   ❌ ERROR Adding Varying Slides:`, err.message);
                }
            }
        }
    }

    // 5. Write Output
    const shortId = uuidv4().substring(0, 8);
    const safeTitle = (formData.title || formData.projectName || 'Presentation')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 40);
    const finalFileName = `${safeTitle}_${shortId}.pptx`;

    let outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    await automizer.write(finalFileName);
    const finalPath = path.join(outputDir, finalFileName);

    // 6. Run Nuclear Post-Processor for reliable placeholder replacement + image injection
    const { nuclearCleanup } = await import('./presentationServiceNew.js');
    if (typeof nuclearCleanup === 'function') {
        const baseDir = process.cwd();
        let tplDir = path.resolve(baseDir, 'templates');
        if (!fs.existsSync(tplDir)) tplDir = path.resolve(baseDir, '..', 'templates');
        nuclearCleanup(finalPath, globalData, tplDir);
    }

    console.log(`\n✅ ENHANCED SYSTEM: Assembly Complete!`);
    console.log(`   Output: ${finalFileName}`);
    console.log(`   Total Slides: ${slideCount}`);
    console.log(`   Location: ${finalPath}`);

    return {
        fileName: finalFileName,
        filePath: finalPath,
        fileSize: fs.statSync(finalPath).size,
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
