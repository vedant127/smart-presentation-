import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import { resolveSlideComponents, getPresentationPlan } from './mappingService.js';
import PizZip from 'pizzip';

/**
 * THE NUCLEAR OPTION: Post-Production Junk Cleaner
 * Directly opens the generated ZIP and wipes all junk strings.
 */
const nuclearCleanup = (filePath, dataContext) => {
    console.log(`   [Nuclear] Starting Post-Production Cleanup: ${path.basename(filePath)}`);
    const data = fs.readFileSync(filePath);
    const zip = new PizZip(data);

    // 1. Identify all slides
    const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));

    slideFiles.forEach(file => {
        let xml = zip.file(file).asText();

        // A. Heal Split Runs (Join broken text)
        xml = xml.replace(/<\/a:t><\/a:r><a:r><a:rPr[^>]*\/><a:t[^>]*>/gi, '');
        xml = xml.replace(/<\/a:t><a:t[^>]*>/gi, '');

        // B. Apply Replacements
        if (dataContext) {
            Object.keys(dataContext).forEach(key => {
                const val = String(dataContext[key] || "");
                const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`{{\\s*${safeKey}\\s*}}`, 'gi');
                xml = xml.replace(regex, val);
            });
        }

        // C. TOC Page Number Fix
        const tocMap = { "13": "03", "03": "04", "01": "05", "18": "06", "25": "07", "11": "08" };
        Object.keys(tocMap).forEach(wrong => {
            const reg = new RegExp(`>\\s*${wrong}\\s*<`, 'g');
            xml = xml.replace(reg, `>${tocMap[wrong]}<`);
        });

        // D. Destroy Junk List
        const junkList = [
            'hhhahah', ',,^kpkpkpk', 'J J J', 'huhuhu', 'jiji', 'Koko', 'juhiihi', 'jij', 'ijiji', 'ihji',
            'jijijijojoji', 'jijijijij', 'jjjjijij', 'jijijijijkjoi', 'iughiuhuhiuh', 'juihugredredtyugijijklo',
            'zrsetdyf', 'zrsedt', 'srdtryf', 'rsetdyfv', 'rcyvbhkj', 'dtryftuvgy', 'retdfytguyh', 'reztsrdtft',
            'rtdfyguy', 'ftgyh', 'ersdtf', 'zsedrtfyt', 'fyguh', 'gyrft', 'ghrftgyhu', 'fguyh', 'erdtfgy',
            'srdtrguyh', 'srdytug', 'dfgyhu', 'drftugy', 'kjhgf', 'ftgkhj', 'sydtkgu', 'gftrde', 'hbgftdtrufgyh',
            'gvfytiugyhj', 'bhjgvfrtd', 'vgtfuyihijkn', 'vfytiguh', 'fcdrtugy'
        ];
        junkList.forEach(junk => {
            const pattern = new RegExp(junk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            xml = xml.replace(pattern, '');
        });

        // E. Wipe remaining {{...}} tags
        xml = xml.replace(/{{\s*[^{}]+\s*}/gi, '');
        xml = xml.replace(/{{\s*[^{}]+\s*}}/gi, '');
        xml = xml.replace(/{{[A-Za-z0-9\-_.]+/gi, '');

        zip.file(file, xml);
    });

    const output = zip.generate({ type: 'nodebuffer' });
    fs.writeFileSync(filePath, output);
    console.log(`   [Nuclear] Cleanup Complete.`);
};

const getSlideCount = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return 0;
        const data = fs.readFileSync(filePath);
        const zip = new PizZip(data);
        return Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
    } catch (e) { return 0; }
};

export const assemblePresentation = async ({ presentationType, formData, plots, userId }) => {
    console.log(`\n============== SYSTEM ASSEMBLY START ==============`);

    const baseDir = process.cwd();
    const outputDir = path.resolve(baseDir, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const automizer = new Automizer({
        templateDir: baseDir,
        outputDir: outputDir,
        removeExistingSlides: true,
        cleanup: false
    });

    let templatesDir = path.resolve(baseDir, 'templates');
    if (!fs.existsSync(templatesDir)) {
        templatesDir = path.resolve(baseDir, '..', 'templates');
    }
    const rootTemplatePath = path.join(templatesDir, 'RootTemplate.pptx');
    if (!fs.existsSync(rootTemplatePath)) {
        throw new Error(`CRITICAL: RootTemplate.pptx missing at ${rootTemplatePath}`);
    }
    automizer.loadRoot(rootTemplatePath);

    const plotContexts = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];

    const globalData = {
        PROJECT_NAME: formData.title || formData.projectName || 'Project Name',
        CLIENT_NAME: formData.clientName || 'Client Name',
        DATE: new Date().toLocaleDateString(),
        YEAR: new Date().getFullYear().toString(),
        CITY: formData.city || formData.City || (plotContexts[0] && (plotContexts[0].city || plotContexts[0].City)) || 'City',
        ASSET_TYPE: formData.assetType || formData.AssetType || (plotContexts[0] && (plotContexts[0].assetType || plotContexts[0].AssetType)) || 'Asset Type',
        Title: formData.title || formData.projectName || 'Presentation',
        Subtitle: formData.subtitle || formData.date || new Date().toLocaleDateString(),
        ...formData
    };

    const typeName = String(presentationType.name || "").toLowerCase();
    const isFeasibility = typeName.includes('feasibility');
    let steps = isFeasibility ? getPresentationPlan() : (presentationType.sections || []).map((sec, idx) => ({
        id: idx + 1,
        name: sec.name,
        folder: sec.folderPath || sec.name,
        vary: sec.isVarying
    }));

    let totalSlidesAdded = 0;
    for (const step of steps) {
        const componentsToAdd = [];
        if (!step.vary) {
            const resolved = resolveSlideComponents(step.id, globalData);
            if (resolved) componentsToAdd.push({ ...resolved, context: globalData });
        } else {
            const addedPaths = new Set();
            for (const context of plotContexts) {
                const resolved = resolveSlideComponents(step.id, { ...globalData, ...context });
                if (resolved && !addedPaths.has(resolved.path)) {
                    componentsToAdd.push({ ...resolved, context: { ...globalData, ...context } });
                    addedPaths.add(resolved.path);
                }
            }
        }

        for (const comp of componentsToAdd) {
            const slideCount = getSlideCount(comp.path);
            if (slideCount === 0) continue;

            const loadKey = `sec${step.id}_${uuidv4().substring(0, 4)}`;
            automizer.load(comp.path, loadKey);
            for (let i = 1; i <= slideCount; i++) {
                automizer.addSlide(loadKey, i);
                totalSlidesAdded++;
            }
            console.log(`   [Section ${step.id}] Merged: ${path.basename(comp.path)} (${slideCount} slides)`);
        }
    }

    const finalFileName = `${(formData.title || 'Report').replace(/[^a-z0-9]/gi, '_')}_${uuidv4().substring(0, 6)}.pptx`;
    const finalPath = path.join(outputDir, finalFileName);

    await automizer.write(finalFileName);

    // --- NUCLEAR CLEANUP (Post-Automizer) ---
    nuclearCleanup(finalPath, globalData);

    console.log(`✅ ASSEMBLY COMPLETE: ${finalFileName} (${totalSlidesAdded} slides)\n`);

    return { fileName: finalFileName, filePath: finalPath, slideCount: totalSlidesAdded };
};

export default { assemblePresentation };
