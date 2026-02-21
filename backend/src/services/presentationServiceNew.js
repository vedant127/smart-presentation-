import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import { resolveSlideComponents, getPresentationPlan } from './mappingService.js';
import PizZip from 'pizzip';

/**
 * BACKGROUND IMAGE INJECTOR
 * Injects background images into slides that should have them.
 * This fixes the issue where pptx-automizer doesn't preserve background images.
 */
const injectBackgroundImages = (filePath, templatesDir) => {
    console.log(`   [Backgrounds] Starting background image injection...`);
    const TEMPLATE_IMG = path.resolve(templatesDir, 'feasibility-study', 'cover-images', 'default.jpg');
    
    if (!fs.existsSync(TEMPLATE_IMG)) {
        console.log(`   [Backgrounds] Template image not found at ${TEMPLATE_IMG}, skipping...`);
        return;
    }

    try {
        const content = fs.readFileSync(filePath);
        const zip = new PizZip(content);
        const imgData = fs.readFileSync(TEMPLATE_IMG);
        const imgExt = path.extname(TEMPLATE_IMG).replace('.', ''); // e.g., 'jpeg' or 'png'
        const imgName = `bg_image.${imgExt}`;

        // Add image to media folder (always add, will overwrite if exists)
        zip.file(`ppt/media/${imgName}`, imgData);

        // Get all slide files
        const slideFiles = Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
            .sort((a, b) => {
                const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
                const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
                return numA - numB;
            });

        let slidesProcessed = 0;

        slideFiles.forEach((slideFile) => {
            const slideXml = zip.file(slideFile).asText();
            const slideNum = parseInt(slideFile.match(/slide(\d+)\.xml/)[1]);

            // Identify header slides by checking for section titles with large fonts
            const headerPatterns = [
                /PROJECT\s+BACKGROUND/i,
                /EXECUTIVE\s+SUMMARY/i,
                /SITE\s+ASSESSMENT/i,
                /FINANCIAL.*INVESTMENT.*ANALYSIS/i,
                /MARKET\s+OVERVIEW/i,
                /DEVELOPMENT\s+RECOMMENDATIONS/i,
                /FEASIBILITY\s+STUDY/i
            ];

            const isHeaderSlide = headerPatterns.some(pattern => pattern.test(slideXml)) &&
                (/fontSize.*[4-5][0-9]|fontSize.*[3-4][0-9]/i.test(slideXml) || 
                 slideNum === 1); // Also treat first slide as header

            if (!isHeaderSlide) return;

            // Get or create relationships file
            const relsPathFull = `ppt/slides/_rels/${path.basename(slideFile)}.rels`;
            let relsXml = '';
            
            if (zip.files[relsPathFull]) {
                relsXml = zip.files[relsPathFull].asText();
            } else {
                // Create new relationships file
                relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
            }

            // Check if image relationship already exists
            if (relsXml.includes(`Target="../media/${imgName}"`)) {
                return; // Already has background image
            }

            // Generate new relationship ID
            const idMatches = relsXml.match(/Id="rId(\d+)"/g);
            let maxId = 0;
            if (idMatches) {
                idMatches.forEach(m => {
                    const id = parseInt(m.match(/Id="rId(\d+)"/)[1]);
                    if (id > maxId) maxId = id;
                });
            }
            const newRId = `rId${maxId + 1}`;

            // Add relationship
            const relationStr = `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imgName}"/>`;
            relsXml = relsXml.replace('</Relationships>', `${relationStr}</Relationships>`);
            zip.file(relsPathFull, relsXml);

            // Inject background into slide XML
            let newSlideXml = slideXml;
            
            // Check if slide already has a <p:bg> element
            if (newSlideXml.includes('<p:bg>')) {
                // Replace entire background element to ensure it's correct
                const bgRegex = /<p:bg>[\s\S]*?<\/p:bg>/;
                const newBgXml = `<p:bg>
        <p:bgPr>
            <a:blipFill>
                <a:blip r:embed="${newRId}"/>
                <a:stretch>
                    <a:fillRect/>
                </a:stretch>
            </a:blipFill>
        </p:bgPr>
    </p:bg>`;
                newSlideXml = newSlideXml.replace(bgRegex, newBgXml);
            } else {
                // Add new background element
                const cSldMatch = newSlideXml.match(/<p:cSld([^>]*)>/);
                if (cSldMatch) {
                    const cSldTag = cSldMatch[0];
                    const bgXml = `
    <p:bg>
        <p:bgPr>
            <a:blipFill>
                <a:blip r:embed="${newRId}"/>
                <a:stretch>
                    <a:fillRect/>
                </a:stretch>
            </a:blipFill>
        </p:bgPr>
    </p:bg>`;
                    newSlideXml = newSlideXml.replace(cSldTag, cSldTag + bgXml);
                }
            }

            zip.file(slideFile, newSlideXml);
            slidesProcessed++;
        });

        // Write the modified file
        const output = zip.generate({ type: 'nodebuffer' });
        fs.writeFileSync(filePath, output);
        console.log(`   [Backgrounds] ✅ Injected background images into ${slidesProcessed} slides.`);
    } catch (error) {
        console.error(`   [Backgrounds] ❌ Error injecting background images:`, error.message);
        console.error(error.stack);
    }
};

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
        xml = xml.replace(/{{\s*[^{}]+\s*}}/gi, '');
        xml = xml.replace(/{{\s*[^{}]+\s*}/gi, '');

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

/**
 * IMAGE REPLACER HELPER
 */
const getImageModifiers = (dataContext) => {
    const modifiers = {};

    // 1. Cover Image
    if (dataContext.coverImage || dataContext.defaultCoverImage) {
        const imgPath = dataContext.coverImage || dataContext.defaultCoverImage;
        // Key is the shape name/title in PPTX
        modifiers['coverImage'] = (shape) => shape.setImage(imgPath);
        modifiers['Picture 1'] = (shape) => shape.setImage(imgPath);
    }

    return modifiers;
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

    // Find professional default assets
    const defaultCoverPath = path.resolve(templatesDir, 'feasibility-study', 'cover-images', 'default.jpg');
    console.log(`   [Assets] Checking for default cover: ${defaultCoverPath}`);

    const globalData = {
        PROJECT_NAME: formData.title || formData.projectName || 'Project Name',
        CLIENT_NAME: formData.clientName || 'Client Name',
        DATE: new Date().toLocaleDateString(),
        YEAR: new Date().getFullYear().toString(),
        CITY: formData.city || formData.City || (plotContexts[0] && (plotContexts[0].city || plotContexts[0].City)) || 'City',
        ASSET_TYPE: formData.assetType || formData.AssetType || (plotContexts[0] && (plotContexts[0].assetType || plotContexts[0].AssetType)) || 'Asset Type',
        defaultCoverImage: fs.existsSync(defaultCoverPath) ? defaultCoverPath : null,
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
    const imageModifiers = getImageModifiers(globalData);

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
                // Apply Image Modifiers if we have any (Section 1 only for now to be safe)
                /* if (step.id === 1 && Object.keys(imageModifiers).length > 0) {
                    automizer.addSlide(loadKey, i, (slide) => {
                        slide.modify(imageModifiers);
                    });
                } else {
                    automizer.addSlide(loadKey, i);
                } */
                automizer.addSlide(loadKey, i);
                totalSlidesAdded++;
            }
            console.log(`   [Section ${step.id}] Merged: ${path.basename(comp.path)} (${slideCount} slides)`);
        }
    }

    const finalFileName = `${(formData.title || 'Report').replace(/[^a-z0-9]/gi, '_')}_${uuidv4().substring(0, 6)}.pptx`;
    const finalPath = path.join(outputDir, finalFileName);

    await automizer.write(finalFileName);

    // --- BACKGROUND IMAGE INJECTION (Post-Automizer) ---
    // Fix missing background images that pptx-automizer doesn't preserve
    injectBackgroundImages(finalPath, templatesDir);

    // --- NUCLEAR CLEANUP (Post-Automizer) ---
    // Only run if we actually have data to replace, and use SAFE mode
    nuclearCleanup(finalPath, globalData);

    console.log(`✅ ASSEMBLY COMPLETE: ${finalFileName} (${totalSlidesAdded} slides)\n`);

    return { fileName: finalFileName, filePath: finalPath, slideCount: totalSlidesAdded };
};

export default { assemblePresentation };
