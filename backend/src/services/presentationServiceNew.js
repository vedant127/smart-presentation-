import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/src/services -> backend
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

/**
 * NATIVE NODE.JS PRESENTATION SERVICE
 * ROBUST IMPLEMENTATION WITH PATH FIXES
 */

/**
 * Copy all slides from source PPTX file into target presentation
 */
async function copySlidesFromFile(sourcePptxPath, automizer, loadKey, replacements = {}) {
    try {
        automizer.load(sourcePptxPath, loadKey);
        automizer.addSlide(loadKey, 1, (slide) => {
            slide.modify(createReplacer(replacements));
        });
        return 1;
    } catch (error) {
        console.error(`   ❌ Error copying slides from ${path.basename(sourcePptxPath)}:`, error.message);
        return 0;
    }
}

function createReplacer(data) {
    return (element, type) => {
        if (type === 'text' && typeof element === 'string') {
            let text = element;
            for (const [key, value] of Object.entries(data)) {
                const placeholder = `{{${key}}}`;
                if (text.includes(placeholder)) {
                    text = text.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value || ''));
                }
            }
            return text;
        }
        return element;
    };
}

function getUniqueCombinations(plots, criteriaNames) {
    const combinations = new Set();
    const uniqueArray = [];
    for (const plot of plots) {
        const combo = {};
        let key = '';
        for (const criterionName of criteriaNames) {
            const plotKey = Object.keys(plot).find(k => k.toLowerCase() === criterionName.toLowerCase());
            const value = plotKey ? plot[plotKey] : '';
            combo[criterionName] = value;
            key += value + '|';
        }
        if (!combinations.has(key)) {
            combinations.add(key);
            uniqueArray.push(combo);
        }
    }
    return uniqueArray;
}

export const assemblePresentation = async ({ presentationType, formData, plots, userId }) => {
    console.log(`\n🏭 NATIVE ASSEMBLY: "${presentationType.name}"`);
    console.log(`   📂 Root Path: ${BACKEND_ROOT}`);

    const config = {
        name: presentationType.name,
        sections: presentationType.sections.sort((a, b) => a.order - b.order),
        criteria: presentationType.criteria
    };

    const outputDir = path.join(BACKEND_ROOT, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    // Initialize Automizer with BACKEND_ROOT paths
    const automizer = new Automizer({
        templateDir: BACKEND_ROOT,
        outputDir: outputDir,
        removeExistingSlides: true,
        cleanup: false
    });

    const libraryRoot = path.join(BACKEND_ROOT, 'Library');
    const rootTemplatePath = path.join(libraryRoot, 'RootTemplate.pptx');

    if (fs.existsSync(rootTemplatePath)) {
        automizer.loadRoot(rootTemplatePath);
        console.log(`   ✅ Loaded Root Template`);
    } else {
        throw new Error(`CRITICAL: RootTemplate.pptx missing at ${rootTemplatePath}`);
    }

    const replacements = {
        PROJECT_NAME: formData.title || 'Project',
        CLIENT_NAME: formData.clientName || 'Client',
        DATE: new Date().toLocaleDateString(),
        CITY: formData.city || '',
        ASSET_TYPE: formData.assetType || ''
    };

    let plotContexts = (plots && plots.length > 0) ? plots.map(p => p.criteria || p) : [formData];
    plotContexts = plotContexts.filter(ctx => ctx && Object.keys(ctx).length > 0);

    const skippedSections = [];
    let slideCount = 0;

    for (const section of config.sections) {
        console.log(`   👉 Section: ${section.name}`);

        const sectionFolderName = section.folderPath || section.name;
        const sectionDir = path.join(libraryRoot, presentationType.name, sectionFolderName);

        if (!fs.existsSync(sectionDir)) {
            skippedSections.push(section.name);
            continue;
        }

        if (!section.isVarying) {
            const files = fs.readdirSync(sectionDir).filter(f => f.endsWith('.pptx') && !f.startsWith('~$'));
            if (files.length > 0) {
                const loadKey = `static_${section.order}_${uuidv4()}`;
                const added = await copySlidesFromFile(path.join(sectionDir, files[0]), automizer, loadKey, replacements);
                slideCount += added;
            }
        } else {
            const relevantCriteria = section.varyingCriteria && section.varyingCriteria.length > 0
                ? section.varyingCriteria
                : config.criteria.map(c => c.name);

            const combos = getUniqueCombinations(plotContexts, relevantCriteria);
            const addedSet = new Set();

            for (const combo of combos) {
                const keyParts = relevantCriteria.map(c => combo[c] || '').filter(v => v);
                const filename = `${keyParts.join(' + ')}.pptx`;
                const filePath = path.join(sectionDir, filename);

                if (fs.existsSync(filePath) && !addedSet.has(filename)) {
                    const loadKey = `vary_${section.order}_${filename.replace(/[^a-z0-9]/gi, '')}_${uuidv4()}`;
                    const added = await copySlidesFromFile(filePath, automizer, loadKey, replacements);
                    slideCount += added;
                    if (added) addedSet.add(filename);
                }
            }
            if (addedSet.size === 0) skippedSections.push(section.name);
        }
    }

    if (slideCount === 0) {
        // Fallback: Add 1 slide from RootTemplate or error
        // But automizer loaded root. If we save now, it might be empty if root was cleared?
        // pptx-automizer usually keeps root slides unless cleared.
        // We didn't clear explicitly.
        // But let's throw error to be safe.
        throw new Error('No slides generated. Check Library.');
    }

    const fileName = `${(formData.title || 'Presentation').replace(/\s+/g, '_')}_${uuidv4()}.pptx`;

    // FIX: Pass only fileName. OutputDir is known to Automizer.
    await automizer.write(fileName);

    console.log(`   ✅ Completion: ${fileName} (${slideCount} slides)`);

    return {
        fileName,
        filePath: path.join(outputDir, fileName),
        slideCount,
        skippedSections
    };
};
