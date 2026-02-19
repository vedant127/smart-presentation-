
import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import { resolveSlideComponents, getPresentationPlan } from './mappingService.js';
import PizZip from 'pizzip';

// Fallback if mappingService is missing (Legacy Mode Helper)
import { findBestMatchFile } from '../utils/fileMatcher.js';

const log = console.log;

const safeText = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

const getSlideCount = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return 0;
        const content = fs.readFileSync(filePath);
        const zip = new PizZip(content);
        // PPTX slides stored as ppt/slides/slideX.xml
        const slideFiles = Object.keys(zip.files).filter(fileName =>
            /^ppt\/slides\/slide\d+\.xml$/.test(fileName)
        );
        return slideFiles.length;
    } catch (err) {
        console.error(`Error counting slides in ${path.basename(filePath)}:`, err.message);
        return 0;
    }
};

const createEnhancedReplacer = (dataContext) => {
    return (xml) => {
        if (typeof xml !== 'string') return xml;
        let modifiedXml = xml;
        if (!dataContext) return modifiedXml;
        Object.keys(dataContext).forEach(key => {
            let val = safeText(dataContext[key]);
            const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`{{\\s*${safeKey}\\s*}}`, 'gi');
            modifiedXml = modifiedXml.replace(regex, val);
        });
        return modifiedXml;
    };
};

// ============================================================================
// MAIN ASSEMBLY FUNCTION
// ============================================================================
export const assemblePresentation = async ({ presentationType, formData, plots, userId }) => {
    console.log(`\n============== SMART ORCHESTRATOR START ==============\n`);
    console.log(`Type: ${presentationType.name}`);
    console.log(`Plots: ${plots ? plots.length : 0}`);

    const automizer = new Automizer({
        templateDir: process.cwd(),
        outputDir: path.join(process.cwd(), 'generated'),
        removeExistingSlides: true,
        cleanup: false
    });

    // 0. Load Root Template
    let libraryRoot = path.join(process.cwd(), 'Library');
    if (!fs.existsSync(libraryRoot)) {
        libraryRoot = path.join(process.cwd(), '..', 'Library');
    }
    const rootTemplatePath = path.join(libraryRoot, 'RootTemplate.pptx');
    if (fs.existsSync(rootTemplatePath)) {
        automizer.loadRoot(rootTemplatePath);
    } else {
        const fallbackRoot = path.join(process.cwd(), 'src', 'Library', 'RootTemplate.pptx');
        if (fs.existsSync(fallbackRoot)) {
            automizer.loadRoot(fallbackRoot);
        } else {
            console.error("CRITICAL: RootTemplate.pptx missing.");
            throw new Error(`RootTemplate.pptx missing`);
        }
    }

    // 1. Data Prep
    let plotContexts = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];
    plotContexts = plotContexts.filter(ctx => ctx && Object.keys(ctx).length > 0);

    // Global Data
    const globalData = {
        PROJECT_NAME: formData.title || formData.projectName || 'Project Name',
        CLIENT_NAME: formData.clientName || 'Client Name',
        DATE: new Date().toLocaleDateString(),
        YEAR: new Date().getFullYear().toString(),
        CITY: formData.city || (plotContexts[0] && plotContexts[0].city) || 'City',
        ASSET_TYPE: formData.assetType || (plotContexts[0] && plotContexts[0].assetType) || 'Asset Type',
        CATEGORY: formData.category || (plotContexts[0] && plotContexts[0].category) || '',
        SPECIFICATIONS: formData.specifications || (plotContexts[0] && plotContexts[0].specifications) || '',
        Title: formData.title || formData.projectName || 'Real Estate Development Project',
        Subtitle: formData.subtitle || formData.date || new Date().toLocaleDateString(),
        SlideTitle: formData.title || 'Project Overview',
        SlideBody: '',
        ...formData
    };

    // 2. CHOOSE ENGINE: ORCHESTRATOR (Feasibility) or LEGACY (Others)
    // The "42 Slides" bug happens because Legacy engine dumps all files in non-varying sections.
    // We enforce Orchestrator for "Feasibility Study" to guarantee 11 slides.

    const isFeasibility = presentationType.name.toLowerCase().includes('feasibility');

    // Determine the Plan
    // If Feasibility, use the strict 11-step plan.
    // If not, try to construct a plan from the DB sections.

    let steps = [];

    if (isFeasibility) {
        console.log("🔹 MODE: Strict 11-Slide Orchestration (Feasibility Study)");
        steps = getPresentationPlan();
    } else {
        console.log(`🔸 MODE: Dynamic Section Loading (${presentationType.name})`);

        // Map DB Sections to Step Structure
        // This is a "Best Effort" translation of the DB config to our new Engine
        // It prevents the "Dump All Files" bug by strictly checking 'isVarying' or forcing smart selection.
        if (presentationType.sections && presentationType.sections.length > 0) {
            steps = presentationType.sections.map((sec, idx) => ({
                id: idx + 1,
                name: sec.name,
                folder: sec.folderPath || sec.name, // Usually the same
                vary: sec.isVarying, // Trust DB or default?
                // Legacy: If not varying, we used to dump all files.
                // New Rule: If NOT varying, we pick the FIRST file only?
                // Or we treat it as a "Folder containing 1 file".
                // If it contains 30 files, we MUST treat it as varying to avoid dumping.
                // We'll enforce "Single File" for non-varying to fix the bug.
            }));
        } else {
            console.warn("⚠️ No sections defined in DB. Presentation will be empty.");
        }
    }

    // 3. Execution Loop
    let totalSlidesAdded = 0;

    for (const step of steps) {
        console.log(`   [Slide ${step.id}] Processing: ${step.name}...`);

        // Resolve Components for this step
        const componentsToAdd = [];

        // STRATEGY:
        // 1. If we are in "Fixed" mode (vary=false), we want ONE file (the generic one).
        // 2. If we are in "Varying" mode (vary=true), we want ONE file PER PLOT context.

        if (!step.vary) {
            // ---> FIXED SECTION <---
            // Use mappingService resolver if available (for Feasibility)
            // Or manual lookup

            let resolvedPath = null;

            if (isFeasibility) {
                const res = resolveSlideComponents(step.id, globalData);
                if (res) resolvedPath = res.path;
            } else {
                // Dynamic Lookup
                const sectionDir = path.join(libraryRoot, presentationType.name, step.folder);
                if (fs.existsSync(sectionDir)) {
                    const files = fs.readdirSync(sectionDir).filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'));
                    if (files.length > 0) {
                        // PREVENT 42 SLIDES BUG: Only take the first file!
                        // Unless it's explicitly a "Multi-Slide Fixed Section" (unlikely for this app)
                        resolvedPath = path.join(sectionDir, files[0]);
                        if (files.length > 1) console.log(`      ⚠️ Found ${files.length} files in fixed folder '${step.folder}'. Using first only: ${files[0]}`);
                    }
                }
            }

            if (resolvedPath) {
                componentsToAdd.push({ path: resolvedPath, context: globalData });
            } else {
                console.log(`      ❌ Fixed file not found for ${step.name}`);
            }

        } else {
            // ---> VARYING SECTION <---
            const addedKeys = new Set();

            for (const context of plotContexts) {
                // Context Keys for Deduplication
                const dedupKey = `${context.city}-${context.assetType}-${context.category}-${context.specifications}`.toLowerCase();

                // Deduplication rule: "Only 2 Market Overview sections inserted, not 3"
                if (addedKeys.has(dedupKey)) continue;

                let resolvedPath = null;

                if (isFeasibility) {
                    const res = resolveSlideComponents(step.id, context);
                    if (res) resolvedPath = res.path;
                } else {
                    // Dynamic Lookup for non-standard types
                    const sectionDir = path.join(libraryRoot, presentationType.name, step.folder);
                    // Build criteria from context
                    // Try to match file
                    const criteria = [context.city, context.assetType, context.category, context.specifications].filter(Boolean);
                    resolvedPath = findBestMatchFile(sectionDir, criteria);
                }

                if (resolvedPath) {
                    // Create a merged context for this slide (Global + Specific Plot Data)
                    const slideSpecificContext = {
                        ...globalData,
                        ...context,
                        // Ensure specific placeholders overwrite globals if present (e.g. PLOT_SIZE)
                    };

                    componentsToAdd.push({
                        path: resolvedPath,
                        context: slideSpecificContext
                    });
                    addedKeys.add(dedupKey);
                } else {
                    console.log(`      ⚠️ No varying match found for ${step.name} (Context: ${dedupKey})`);
                }
            }
        }

        // Add Logic
        if (componentsToAdd.length === 0) {
            console.log(`      ⚠️ Skipped Step ${step.id} (No valid files)`);
            continue;
        }

        for (const comp of componentsToAdd) {
            const slideCount = getSlideCount(comp.path);
            if (slideCount === 0) continue;

            const loadKey = `slide_${step.id}_${path.basename(comp.path).replace(/[^a-z0-9]/gi, '')}_${uuidv4()}`;

            try {
                automizer.load(comp.path, loadKey);
                // Force add ALL slides from the resolved file
                for (let i = 1; i <= slideCount; i++) {
                    automizer.addSlide(loadKey, i, (slide) => {
                        slide.modify(createEnhancedReplacer(comp.context));
                    });
                    totalSlidesAdded++;
                }
                console.log(`      ✅ Added ${path.basename(comp.path)} (${slideCount} slides)`);
            } catch (err) {
                console.error(`      ❌ Error adding ${comp.path}: ${err.message}`);
            }
        }
    }

    // 4. Output
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
