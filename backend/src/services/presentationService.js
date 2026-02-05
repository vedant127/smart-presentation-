import PptxGenJS from 'pptxgenjs';
import path from 'path';
import fs from 'fs';

/**
 * Generate a Professional "Gamma.ai style" Presentation - V2 Polished Design
 * Optimized for spacing, typography, and color harmony.
 * Replaces the old merging logic with direct programmatic generation.
 */
import { generateSlideContent } from './aiService.js';

/**
 * Generate a Professional "Gamma.ai style" Presentation - V2 Polished Design
 * Optimized for spacing, typography, and color harmony.
 * Replaces the old merging logic with direct programmatic generation.
 */
import { Automizer, modify } from 'pptx-automizer';

/**
 * Presentation Assembly Engine
 * Assembles a final presentation by stitching together existing PPTX files from the Library.
 * Follows strict rules for Varying vs Unvarying sections.
 */
export const generatePresentation = async ({ presentationType, formData, plots, userId }) => {
    console.log(`🏭 ASSEMBLE: Starting assembly for "${presentationType.name}"`);

    const automizer = new Automizer({
        templateDir: path.join(process.cwd(), 'Library'),
        outputDir: path.join(process.cwd(), 'generated'),
        compression: 0
    });

    // Helper: Force forward slashes for Automizer keys
    const normalize = (p) => p.split(path.sep).join('/');

    // 1. Identify all files to load
    const filesToLoad = new Set();
    const orderedSections = presentationType.sections.sort((a, b) => a.order - b.order);

    const getVaryingFile = (section, plot) => {
        const criteriaKeys = section.varyingCriteria || [];
        const values = criteriaKeys.map(key => {
            const val = plot.criteria?.[key] || plot[key];
            return val ? val.trim() : 'Unknown';
        });
        const p = path.join(presentationType.name, section.folderPath, values.join('_') + '.pptx');
        return normalize(p);
    };

    for (const section of orderedSections) {
        // We look for files in the filesystem using OS paths, but store KEYS as normalized
        const sectionFolderOS = path.join(process.cwd(), 'Library', presentationType.name, section.folderPath);

        if (!fs.existsSync(sectionFolderOS)) {
            console.warn(`⚠️ Missing folder: ${section.folderPath}`);
            continue;
        }

        if (!section.isVarying) {
            const files = fs.readdirSync(sectionFolderOS).filter(f => f.endsWith('.pptx'));
            if (files.length > 0) {
                const fullKey = normalize(path.join(presentationType.name, section.folderPath, files[0]));
                filesToLoad.add(fullKey);
            }
        } else {
            const loops = presentationType.enablePlots ? plots : [{ criteria: formData }];
            for (const plot of loops) {
                const key = getVaryingFile(section, plot);
                // Verify existence using OS path
                if (fs.existsSync(path.join(process.cwd(), 'Library', key))) {
                    filesToLoad.add(key);
                }
            }
        }
    }

    console.log(`   -> Files to Load:`, Array.from(filesToLoad));

    const pres = automizer.loadRoot(`RootTemplate.pptx`);

    for (const fileKey of filesToLoad) {
        try {
            // Automizer.load take the key relative to templateDir. 
            // We pass the forward-slash string. It should work on Windows too for internal lookups.
            automizer.load(fileKey);
        } catch (e) {
            console.warn(`Failed to load ${fileKey}:`, e.message);
        }
    }

    // 3. Assemble
    for (const section of orderedSections) {
        console.log(`   -> Assembling Section: ${section.name}`);

        if (!section.isVarying) {
            // Find the key we (likely) added
            const sectionFolderOS = path.join(process.cwd(), 'Library', presentationType.name, section.folderPath);
            if (fs.existsSync(sectionFolderOS)) {
                const files = fs.readdirSync(sectionFolderOS).filter(f => f.endsWith('.pptx'));
                if (files.length > 0) {
                    const key = normalize(path.join(presentationType.name, section.folderPath, files[0]));
                    try {
                        if (filesToLoad.has(key)) pres.addSlide(key, 1);
                    } catch (e) { console.warn(`Skipped ${key}`, e.message); }
                }
            }
        } else {
            // VARYING SECTION LOGIC WITH OVERLAP HANDLING
            // "If two or more plots share exactly the same set of characteristics... Generate only one section"

            const loops = presentationType.enablePlots ? plots : [{ criteria: formData }];
            const processedKeys = new Set(); // Track unique file keys to prevent duplicates

            for (const plot of loops) {
                const key = getVaryingFile(section, plot);

                // key looks like: "Feasibility Study/06_MarketOverview/Riyadh_Residential.pptx"
                // If we have already added this EXACT file for this section, skip it (Deduplication)
                if (processedKeys.has(key)) {
                    console.log(`      ⚠️ Duplicate Plot Characteristic detected (${key}). Skipping redundant section.`);
                    continue;
                }

                if (filesToLoad.has(key)) {
                    try {
                        console.log(`      -> Adding Slide for Unique Plot: ${key}`);
                        pres.addSlide(key, 1);
                        processedKeys.add(key); // Mark as processed
                    } catch (e) { console.warn(`Skipped ${key}`, e.message); }
                }
            }
        }
    }

    // --- WRITE OUTPUT ---
    const fileName = `${formData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pptx`;

    await pres.write(fileName);

    console.log(`✅ Assembly Complete: ${fileName}`);
    return {
        fileName,
        filePath: path.join(process.cwd(), 'generated', fileName),
        fileSize: 0
    };
};

// Deprecated or Unused exports for compatibility if needed, though mostly replaced
export const mergePptxFiles = async () => { throw new Error('Merge functionality has been replaced by Pro Generation'); };
export const buildFileKey = () => { };
