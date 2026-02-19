
import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import { findBestMatchFile } from '../utils/fileMatcher.js';
import PizZip from 'pizzip';

const log = console.log;

// Helper: Ensure text is always a valid string
const safeText = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

// Helper: Get slide count using PizZip to inspect the file structure
const getSlideCount = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return 0;
        const content = fs.readFileSync(filePath);
        const zip = new PizZip(content);
        // Slides are stored as ppt/slides/slideX.xml
        // We filter the files in the zip to count them
        const slideFiles = Object.keys(zip.files).filter(fileName =>
            /^ppt\/slides\/slide\d+\.xml$/.test(fileName)
        );
        return slideFiles.length;
    } catch (err) {
        console.error(`Error counting slides in ${path.basename(filePath)}:`, err.message);
        return 0;
    }
};

/**
 * Enhanced Placeholder Replacer - Robust XML tag handling
 */
const createEnhancedReplacer = (dataContext) => {
    return (xml) => {
        if (typeof xml !== 'string') return xml;

        let modifiedXml = xml;
        if (!dataContext) return modifiedXml;

        Object.keys(dataContext).forEach(key => {
            let val = safeText(dataContext[key]);

            // 1. Simple Replacement Match
            const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`{{\\s*${safeKey}\\s*}}`, 'gi');

            // 2. Broken XML Tag Match (e.g. {{</t><t>Title</t><t>}})
            // Matches {{ ... key ... }} spanning multiple tags
            // Simplified approach: remove logical XML tags between curly braces if they break the placeholder
            // Note: This is complex. We will focus on standard text replacement first.

            modifiedXml = modifiedXml.replace(regex, val);
        });

        return modifiedXml;
    };
};

// Start Assembly Code
export const assemblePresentation = async ({ presentationType, formData, plots, userId }) => {
    console.log(`\n============== HYBRID ASSEMBLY START ==============\n`);

    // 1. Setup Automizer
    const automizer = new Automizer({
        templateDir: process.cwd(),
        outputDir: path.join(process.cwd(), 'generated'),
        removeExistingSlides: true,
        cleanup: false
    });

    // 1.1 Load Root Template
    let libraryRoot = path.join(process.cwd(), 'Library');
    if (!fs.existsSync(libraryRoot)) {
        libraryRoot = path.join(process.cwd(), '..', 'Library');
    }

    const rootTemplatePath = path.join(libraryRoot, 'RootTemplate.pptx');
    if (fs.existsSync(rootTemplatePath)) {
        automizer.loadRoot(rootTemplatePath);
        console.log(`   ✅ Loaded Root Template: ${rootTemplatePath}`);
    } else {
        // Try fallback location relative to src
        const fallbackRoot = path.join(process.cwd(), 'src', 'Library', 'RootTemplate.pptx');
        if (fs.existsSync(fallbackRoot)) {
            libraryRoot = path.join(process.cwd(), 'src', 'Library');
            automizer.loadRoot(fallbackRoot);
            console.log(`   ✅ Loaded Root Template: ${fallbackRoot}`);
        } else {
            console.error(`RootTemplate.pptx missing at ${rootTemplatePath}`);
            throw new Error(`RootTemplate.pptx missing`);
        }
    }

    // 2. Prepare Contexts
    let plotContexts = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];
    plotContexts = plotContexts.filter(ctx => ctx && Object.keys(ctx).length > 0);

    // 3. Global Data (FIX 3: Added Title, Subtitle, etc)
    const globalData = {
        PROJECT_NAME: formData.title || formData.projectName || 'Project Name',
        CLIENT_NAME: formData.clientName || 'Client Name',
        DATE: new Date().toLocaleDateString(),
        YEAR: new Date().getFullYear().toString(),
        CITY: formData.city || (plotContexts[0] && plotContexts[0].city) || 'City',
        ASSET_TYPE: formData.assetType || (plotContexts[0] && plotContexts[0].assetType) || 'Asset Type',
        CATEGORY: formData.category || (plotContexts[0] && plotContexts[0].category) || '',
        SPECIFICATIONS: formData.specifications || (plotContexts[0] && plotContexts[0].specifications) || '',

        // FIX 3 Maps
        Title: formData.title || formData.projectName || 'Real Estate Development Project',
        Subtitle: formData.subtitle || formData.date || new Date().toLocaleDateString(),
        SlideTitle: formData.title || 'Project Overview',
        SlideBody: '',

        ...formData
    };

    // 4. Iterate Sections
    const sections = (presentationType.sections || []).sort((a, b) => a.order - b.order);
    let totalSlidesAdded = 0;

    for (const section of sections) {
        console.log(`\n   [Section ${section.order}] ${section.name}`);
        const typeFolderName = presentationType.name;
        const sectionFolderName = section.folderPath || section.name;
        const sectionDir = path.join(libraryRoot, typeFolderName, sectionFolderName);

        if (!fs.existsSync(sectionDir)) {
            console.log(`      ⚠️ Folder not found: ${sectionFolderName}`);
            continue;
        }

        // --- NON-VARYING (FIXED) ---
        if (!section.isVarying) {
            // FIX 4: Loop through ALL files in the section folder
            const files = fs.readdirSync(sectionDir)
                .filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'))
                .sort(); // Consistent order

            if (files.length === 0) {
                console.log(`      ⚠️ No PPTX files in folder`);
                continue;
            }

            for (const filename of files) {
                const filePath = path.join(sectionDir, filename);

                // FIX 1: Check actual slide count
                const slideCount = getSlideCount(filePath);
                if (slideCount === 0) {
                    console.log(`      ⚠️ Skipping ${filename} (0 slides)`);
                    continue;
                }

                console.log(`      matches fixed file: ${filename} (${slideCount} slides)`);

                const loadKey = `fixed_${section.order}_${filename.replace(/[^a-z0-9]/gi, '')}_${uuidv4()}`;

                try {
                    automizer.load(filePath, loadKey);
                    // Loop 1 to N
                    for (let i = 1; i <= slideCount; i++) {
                        automizer.addSlide(loadKey, i, (slide) => {
                            slide.modify(createEnhancedReplacer(globalData));
                        });
                        totalSlidesAdded++;
                    }
                } catch (err) {
                    console.error(`      ❌ Error adding file ${filename}: ${err.message}`);
                }
            }
        }

        // --- VARYING (FIX 2: Improved Varying Logic) ---
        else {
            const addedFilesForSection = new Set();

            // Identify criteria keys
            const critKeys = (section.varyingCriteria && section.varyingCriteria.length > 0)
                ? section.varyingCriteria
                : ['City', 'Asset Type', 'Category', 'Specifications'];

            for (const context of plotContexts) {
                // FIX 2: Better Search Tokens Construction
                const searchTokens = [];

                console.log("SEARCH TOKENS BUILD:", {
                    critKeys,
                    contextKeys: Object.keys(context)
                });

                for (const critKey of critKeys) {
                    // Normalize the CRITERIA KEY name (e.g. "Asset Type" -> "assettype")
                    const critKeyNorm = critKey.toLowerCase().replace(/[^a-z0-9]/g, '');

                    // Find matching key in context
                    const foundKey = Object.keys(context).find(k =>
                        k.toLowerCase().replace(/[^a-z0-9]/g, '') === critKeyNorm
                    );

                    if (foundKey && context[foundKey]) {
                        searchTokens.push(String(context[foundKey]));
                    }
                }

                console.log("SEARCH TOKENS:", searchTokens, "CONTEXT KEYS:", Object.keys(context));

                if (searchTokens.length === 0) continue;

                // SPECIAL LOGIC: "Details" sheet implementation
                // If a token is "Spec1" or "Spec2", we need strict matching if possible.
                // findBestMatchFile handles fuzzy, but we prefer strict.

                const bestFilePath = findBestMatchFile(sectionDir, searchTokens);

                if (!bestFilePath) {
                    console.log(`      ⏭️ No match for tokens: [${searchTokens.join(', ')}]`);
                    continue;
                }

                const filename = path.basename(bestFilePath);
                if (addedFilesForSection.has(filename)) continue;

                // FIX 1: Count slides
                const slideCount = getSlideCount(bestFilePath);
                if (slideCount === 0) continue;

                console.log(`      ✅ Matched Loop: ${filename} (${slideCount} slides)`);
                addedFilesForSection.add(filename);

                const loadKey = `vary_${section.order}_${filename.replace(/[^a-z0-9]/gi, '')}_${uuidv4()}`;

                try {
                    automizer.load(bestFilePath, loadKey);

                    // Context specific to this plot
                    const slideData = {
                        ...globalData,
                        ...context,
                        // Override specific fields for this slide's context
                        CITY: context.city || globalData.CITY,
                        ASSET_TYPE: context.assetType || context.asset_type || globalData.ASSET_TYPE,
                        CATEGORY: context.category || globalData.CATEGORY,
                        SPECIFICATIONS: context.specifications || context.specs || globalData.SPECIFICATIONS
                    };

                    for (let i = 1; i <= slideCount; i++) {
                        automizer.addSlide(loadKey, i, (slide) => {
                            slide.modify(createEnhancedReplacer(slideData));
                        });
                        totalSlidesAdded++;
                    }
                } catch (err) {
                    console.error(`      ❌ Error adding varying file ${filename}: ${err.message}`);
                }
            }
        }
    }

    // 5. Output
    const runId = uuidv4();
    const finalFileName = `${(formData.title || formData.projectName || 'Presentation').replace(/[^a-zA-Z0-9_\-]/g, '_')}_${runId}.pptx`;

    let outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(path.join(process.cwd(), 'Library'))) {
        outputDir = path.join(process.cwd(), '..', 'generated');
    }
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    await automizer.write(finalFileName);

    const finalPath = path.join(outputDir, finalFileName);
    console.log(`\n✅ Assembly Complete: ${finalPath} (${totalSlidesAdded} slides)`);

    return {
        fileName: finalFileName,
        filePath: finalPath,
        slideCount: totalSlidesAdded
    };
};

export const generatePresentation = assemblePresentation;
export const generatePresentationFromTemplate = assemblePresentation;

export default {
    assemblePresentation,
    generatePresentation,
    generatePresentationFromTemplate
};
