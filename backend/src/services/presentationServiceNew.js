import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import PizZip from 'pizzip';
import { resolveSlideComponents, getPresentationPlan } from './mappingService.js';

// ─── Post-Production Junk Cleaner & Image Injector ───────────
export const nuclearCleanup = (filePath, dataContext, templatesDir) => {
    console.log(`   [Nuclear] Starting Post-Production Cleanup: ${path.basename(filePath)}`);
    const data = fs.readFileSync(filePath);
    const zip = new PizZip(data);

    const slideFiles = Object.keys(zip.files)
        .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
        .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
            const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
            return numA - numB;
        });

    const bgImgPath = path.resolve(templatesDir, 'feasibility-study', 'cover-images', 'default.jpg');
    let bgImgBuffer = null;
    let bgImgExt = 'jpg';
    if (fs.existsSync(bgImgPath)) {
        bgImgBuffer = fs.readFileSync(bgImgPath);
        bgImgExt = path.extname(bgImgPath).replace('.', '');
    }

    const bgImgName = `global_bg_image.${bgImgExt}`;
    if (bgImgBuffer) {
        zip.file(`ppt/media/${bgImgName}`, bgImgBuffer);
    }

    slideFiles.forEach(file => {
        let xml = zip.file(file).asText();

        // 1. HEAL SPLIT RUNS
        xml = xml.replace(/<\/a:t><\/a:r><a:r><a:rPr[^>]*\/><a:t[^>]*>/gi, '');
        xml = xml.replace(/<\/a:t><a:t[^>]*>/gi, '');

        // 2. IMAGE REPLACEMENT
        if (xml.includes('REPLACE_ME_COVER_IMAGE') && bgImgBuffer) {
            console.log(`      [Nuclear] Swapping cover placeholder in ${file}`);
            const blipMatch = xml.match(/<a:blip r:embed="(rId\d+)"[^>]*>/);
            if (blipMatch) {
                const rId = blipMatch[1];
                const relsFile = `ppt/slides/_rels/${path.basename(file)}.rels`;
                if (zip.file(relsFile)) {
                    let relsXml = zip.file(relsFile).asText();
                    const targetMatch = relsXml.match(new RegExp(`Id="${rId}"[^>]*Target="..\\/media\\/([^"]+)"`));
                    if (targetMatch) {
                        zip.file(`ppt/media/${targetMatch[1]}`, bgImgBuffer);
                        xml = xml.replace('REPLACE_ME_COVER_IMAGE', '');
                    }
                }
            }
        }

        // 3. BACKGROUND INJECTION
        const headerPatterns = [/PROJECT\s+BACKGROUND/i, /EXECUTIVE\s+SUMMARY/i, /SITE\s+ASSESSMENT/i, /FINANCIAL.*INVESTMENT.*ANALYSIS/i, /MARKET\s+OVERVIEW/i, /DEVELOPMENT\s+RECOMMENDATIONS/i, /FEASIBILITY\s+STUDY/i, /TABLE\s+OF\s+CONTENTS/i];
        if (headerPatterns.some(p => p.test(xml)) && bgImgBuffer && !xml.includes('<p:bg>')) {
            const relsFile = `ppt/slides/_rels/${path.basename(file)}.rels`;
            let relsXml = zip.file(relsFile) ? zip.file(relsFile).asText() : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
            const idMatches = relsXml.match(/Id="rId(\d+)"/g);
            let maxId = 50;
            if (idMatches) idMatches.forEach(m => { const id = parseInt(m.match(/Id="rId(\d+)"/)[1]); if (id > maxId) maxId = id; });
            const newRId = `rId${maxId + 1}`;
            relsXml = relsXml.replace('</Relationships>', `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${bgImgName}"/></Relationships>`);
            zip.file(relsFile, relsXml);
            const bgXml = `<p:bg><p:bgPr><a:blipFill><a:blip r:embed="${newRId}"><a:lum/></a:blip><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst><a:duotone><a:schemeClr val="accent1"/><a:schemeClr val="bg1"/></a:duotone></a:effectLst></p:bgPr></p:bg>`;
            const cSldMatch = xml.match(/<p:cSld([^>]*)>/);
            if (cSldMatch) xml = xml.replace(cSldMatch[0], cSldMatch[0] + bgXml);
        }

        // 4. DATA REPLACEMENT
        if (dataContext) {
            Object.keys(dataContext).forEach(key => {
                const val = String(dataContext[key] || "");
                const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`{{\\s*${safeKey}\\s*}}`, 'gi');
                xml = xml.replace(regex, val);
            });
        }

        xml = xml.replace(/{{\s*[^{}]+\s*}}/gi, '');
        xml = xml.replace(/{{\s*[^{}]+\s*}/gi, '');
        zip.file(file, xml);
    });

    fs.writeFileSync(filePath, zip.generate({ type: 'nodebuffer' }));
};

const getSlideCount = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return 0;
        const zip = new PizZip(fs.readFileSync(filePath));
        return Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
    } catch { return 0; }
};

export const assemblePresentation = async ({ presentationType, formData = {}, plots = [], userId }) => {
    console.log(`\n============== FELIX ASSEMBLY START ==============`);

    const baseDir = process.cwd();
    const outputDir = path.resolve(baseDir, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    let templatesDir = path.resolve(baseDir, 'templates');
    if (!fs.existsSync(templatesDir)) templatesDir = path.resolve(baseDir, '..', 'templates');

    const rootTemplatePath = path.join(templatesDir, 'RootTemplate.pptx');
    if (!fs.existsSync(rootTemplatePath)) throw new Error(`CRITICAL: RootTemplate.pptx missing at ${rootTemplatePath}`);

    const automizer = new Automizer({ templateDir: baseDir, outputDir: outputDir, removeExistingSlides: true, cleanup: false });
    automizer.loadRoot(rootTemplatePath);

    const globalData = {
        PROJECT_NAME: formData.title || formData.projectName || 'Project Name',
        CLIENT_NAME: formData.clientName || 'Client Name',
        DATE: new Date().toLocaleDateString('en-GB'),
        YEAR: String(new Date().getFullYear()),
        CITY: formData.city || formData.City || '',
        ASSET_TYPE: formData.assetType || formData.AssetType || '',
        ...formData
    };

    const plotContexts = (plots && plots.length > 0) ? plots.map(p => ({ ...globalData, ...(p.criteria || p.data || p) })) : [globalData];
    const steps = getPresentationPlan();

    let totalSlidesAdded = 0;
    for (const step of steps) {
        let componentsToAdd = [];
        if (!step.vary) {
            const resolved = resolveSlideComponents(step.id, globalData);
            if (resolved) componentsToAdd.push(resolved);
        } else {
            const addedPaths = new Set();
            for (const context of plotContexts) {
                const resolved = resolveSlideComponents(step.id, context);
                if (resolved && !addedPaths.has(resolved.path)) {
                    componentsToAdd.push(resolved);
                    addedPaths.add(resolved.path);
                }
            }
        }

        for (const comp of componentsToAdd) {
            const count = getSlideCount(comp.path);
            if (count === 0) continue;
            const loadKey = `sec${step.id}_${uuidv4().substring(0, 4)}`;
            automizer.load(comp.path, loadKey);
            for (let i = 1; i <= count; i++) {
                automizer.addSlide(loadKey, i);
                totalSlidesAdded++;
            }
            console.log(`   [Section ${step.id}] Merged: ${path.basename(comp.path)} (${count} slides)`);
        }
    }

    const finalFileName = `${(formData.title || 'Report').replace(/[^a-z0-9]/gi, '_')}_${uuidv4().substring(0, 6)}.pptx`;
    const finalPath = path.join(outputDir, finalFileName);
    await automizer.write(finalFileName);

    nuclearCleanup(finalPath, globalData, templatesDir);
    console.log(`✅ ASSEMBLY COMPLETE: ${finalFileName} (${totalSlidesAdded} slides)\n`);

    return { fileName: finalFileName, filePath: finalPath, slideCount: totalSlidesAdded };
};

export default { assemblePresentation };