import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import PizZip from 'pizzip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ══════════════════════════════════════════════════════════════════════════════
//  PRESENTATION SERVICE (New) — v5 Bulletproof JSZip merge
//  Used by projectController.js
//  Same logic as presentationServiceEnhanced.js
// ══════════════════════════════════════════════════════════════════════════════

// Use keyBuilder for form + schema compatibility (includes price range)
import { buildKey, buildKeyFromForm, formDataToCriteria, findMatchingFile } from '../utils/keyBuilder.js';

function getUniqueKeys(plots) {
    const uniqueKeys = new Set();
    for (const plot of plots || []) {
        const criteria = plot.criteria || plot.data || plot;
        const key = (criteria.city || criteria.propertyType || criteria.priceRange)
            ? buildKeyFromForm(criteria)
            : buildKey(formDataToCriteria(criteria));
        if (key) uniqueKeys.add(key);
        const legacy = buildKey(formDataToCriteria(criteria));
        if (legacy) uniqueKeys.add(legacy);
    }
    return Array.from(uniqueKeys);
}

function countSlides(filePath) {
    try {
        const zip = new PizZip(fs.readFileSync(filePath));
        return Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
    } catch { return 0; }
}

function countSlidesInZip(zip) {
    return Object.keys(zip.files)
        .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
}

// Library path: always resolve from backend root (works regardless of process.cwd())
function getLibraryPath(typeName = 'Feasibility Study') {
    const backendRoot = path.join(__dirname, '..', '..');
    const candidates = [
        path.join(backendRoot, 'Library', typeName),
        path.join(process.cwd(), 'Library', typeName),
        path.join(process.cwd(), '..', 'Library', typeName),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    const libRoot = path.join(backendRoot, 'Library');
    if (fs.existsSync(libRoot)) return path.join(libRoot, typeName);
    throw new Error(`Library folder not found for type: ${typeName}. Run: npm run populate`);
}

// ─── Bulletproof Merge ───────────────────────────────────────────────────────
async function mergePptxFiles(fileList) {
    if (fileList.length === 0) throw new Error('No files to merge!');
    if (fileList.length === 1) return fs.readFileSync(fileList[0]);

    const baseBuffer = fs.readFileSync(fileList[0]);
    const outputZip = await JSZip.loadAsync(baseBuffer);

    let slideCount = countSlidesInZip(outputZip);

    let maxRId = 0;
    const presRelsPath = 'ppt/_rels/presentation.xml.rels';
    let presRelsXml = '';
    const presRelsFile = outputZip.file(presRelsPath);
    if (presRelsFile) {
        presRelsXml = await presRelsFile.async('string');
        for (const m of presRelsXml.matchAll(/Id="rId(\d+)"/g)) {
            maxRId = Math.max(maxRId, parseInt(m[1]));
        }
    }

    let maxSldId = 256;
    let presXml = '';
    const presXmlFile = outputZip.file('ppt/presentation.xml');
    if (presXmlFile) {
        presXml = await presXmlFile.async('string');
        for (const m of presXml.matchAll(/id="(\d+)"/g)) {
            maxSldId = Math.max(maxSldId, parseInt(m[1]));
        }
    }

    const newSldIdEntries = [];
    const newRelEntries = [];
    const newContentTypeEntries = [];

    for (let s = 1; s < fileList.length; s++) {
        const srcPath = fileList[s];
        const srcName = path.basename(srcPath);
        let srcZip;
        try {
            srcZip = await JSZip.loadAsync(fs.readFileSync(srcPath));
        } catch (err) {
            console.log(`[DEBUG] SKIP file ${s + 1}: ${srcName} (load error: ${err.message})`);
            continue;
        }

        const srcSlides = Object.keys(srcZip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
            .sort((a, b) => parseInt(a.match(/slide(\d+)/)[1]) - parseInt(b.match(/slide(\d+)/)[1]));

        console.log(`[DEBUG] Preparing to add ${srcSlides.length} slides from file "${srcName}"`);

        let addedCount = 0;
        for (const srcSlidePath of srcSlides) {
            const slideFile = srcZip.file(srcSlidePath);
            if (!slideFile || slideFile.dir) continue;

            const srcNum = srcSlidePath.match(/slide(\d+)/)[1];
            console.log(`[DEBUG] Attempting to add slide ${srcNum}/${srcSlides.length} from "${srcName}"`);

            try {
                slideCount++;
                maxRId++;
                maxSldId++;

                outputZip.file(`ppt/slides/slide${slideCount}.xml`, await slideFile.async('string'));

                const srcRelFile = srcZip.file(`ppt/slides/_rels/slide${srcNum}.xml.rels`);
                let relXml;
                if (srcRelFile && !srcRelFile.dir) {
                    relXml = await srcRelFile.async('string');
                    for (const mr of relXml.matchAll(/Target="\.\.\/media\/([^"]+)"/g)) {
                        const orig = mr[1];
                        const uniq = `s${s}_${orig}`;
                        relXml = relXml.split(`../media/${orig}`).join(`../media/${uniq}`);
                        const srcMedia = srcZip.file(`ppt/media/${orig}`);
                        if (srcMedia && !srcMedia.dir) {
                            outputZip.file(`ppt/media/${uniq}`, await srcMedia.async('nodebuffer'));
                        }
                    }
                } else {
                    relXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
                }
                outputZip.file(`ppt/slides/_rels/slide${slideCount}.xml.rels`, relXml);

                newSldIdEntries.push(`<p:sldId id="${maxSldId}" r:id="rId${maxRId}"/>`);
                newRelEntries.push(`<Relationship Id="rId${maxRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${slideCount}.xml"/>`);
                newContentTypeEntries.push(`<Override PartName="/ppt/slides/slide${slideCount}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`);

                addedCount++;
                console.log(`[DEBUG] SUCCESS - slide ${srcNum} added as output slide ${slideCount}`);
            } catch (err) {
                console.log(`[DEBUG] ERROR adding slide ${srcNum}:`, err.message);
            }
        }

        console.log(`[DEBUG] Finished adding from "${srcName}". Actually added: ${addedCount} slides`);
    }

    if (newContentTypeEntries.length > 0) {
        const ct = outputZip.file('[Content_Types].xml');
        if (ct) outputZip.file('[Content_Types].xml', (await ct.async('string')).replace('</Types>', newContentTypeEntries.join('') + '</Types>'));
    }
    if (newSldIdEntries.length > 0 && presXml.includes('</p:sldIdLst>')) {
        outputZip.file('ppt/presentation.xml', presXml.replace('</p:sldIdLst>', newSldIdEntries.join('') + '</p:sldIdLst>'));
    }
    if (newRelEntries.length > 0 && presRelsXml) {
        outputZip.file(presRelsPath, presRelsXml.replace('</Relationships>', newRelEntries.join('') + '</Relationships>'));
    }

    return await outputZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

// ─── Token Replacement ───────────────────────────────────────────────────────
async function replaceTokens(pptxPath, replacements) {
    const buffer = fs.readFileSync(pptxPath);
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));

    for (const slidePath of slideFiles) {
        const sf = zip.file(slidePath);
        if (!sf || sf.dir) continue;
        let xml = await sf.async('string');
        let modified = false;

        for (const [token, value] of Object.entries(replacements)) {
            if (xml.includes(token)) { xml = xml.split(token).join(value); modified = true; }
        }

        for (const [token, value] of Object.entries(replacements)) {
            xml = xml.replace(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/g, (paragraph) => {
                const parts = []; let m;
                const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
                while ((m = re.exec(paragraph)) !== null) parts.push(m[1]);
                const full = parts.join('');
                if (full.includes(token)) {
                    modified = true;
                    const replaced = full.split(token).join(value);
                    let first = true;
                    return paragraph.replace(/<a:r\b[^>]*>[\s\S]*?<\/a:r>/g, (run) => {
                        if (first) { first = false; return run.replace(/<a:t[^>]*>[\s\S]*?<\/a:t>/, `<a:t>${replaced}</a:t>`); }
                        const t = run.replace(/<[^>]*>/g, '').trim();
                        if (token.includes(t) || t.includes('{') || t.includes('}')) return '';
                        return run;
                    });
                }
                return paragraph;
            });
        }
        if (modified) zip.file(slidePath, xml);
    }
    fs.writeFileSync(pptxPath, await zip.generateAsync({ type: 'nodebuffer' }));
}

// #region agent log
function debugLog(msg, data) {
    const logPath = path.join(process.cwd(), '..', 'debug-776817.log');
    try {
        const line = JSON.stringify({ sessionId: '776817', timestamp: Date.now(), message: msg, data: data || {} }) + '\n';
        fs.appendFileSync(logPath, line);
    } catch (_) {}
}
// #endregion

export async function assemblePresentation({ presentationType, formData = {}, plots = [], userId }) {
    console.log('\n══════════════════════════════════════════');
    console.log('  ASSEMBLY START (v5 — Bulletproof Merge)');
    console.log('══════════════════════════════════════════');

    // #region agent log
    debugLog('ASSEMBLY_START', { plotsCount: plots?.length, plots: plots });
    // #endregion

    // ─── Debug: raw plots from request ───────────────────────────────────────
    console.log('FULL BODY PLOTS RECEIVED:', JSON.stringify(plots, null, 2));
    console.log('Number of plots:', plots?.length || 0);

    const typeName = presentationType?.name || 'Feasibility Study';
    const templateDir = getLibraryPath(typeName);

    // #region agent log
    debugLog('TEMPLATE_DIR', { templateDir, typeName });
    // #endregion

    // ─── 1. Loop over plots, build keys, collect UNIQUE keys only ─────────────
    const uniqueKeys = getUniqueKeys(plots || []);
    if (plots?.length > 0) {
        plots.forEach((plot, i) => {
            const criteria = plot.criteria || plot.data || plot;
            const key = buildKey(criteria);
            console.log(`Plot ${i + 1} raw criteria:`, JSON.stringify(criteria, null, 2));
            console.log(`Plot ${i + 1} generated key:`, key || 'NULL_OR_EMPTY');
        });
    }
    console.log('Unique keys:', uniqueKeys);

    // #region agent log
    debugLog('UNIQUE_KEYS', { uniqueKeys });
    // #endregion

    const files = [];

    function addFixed(folder, filename, label) {
        const folderPath = path.join(templateDir, folder);
        const fullPath = path.join(folderPath, filename);
        if (fs.existsSync(fullPath)) {
            const slideCount = countSlides(fullPath);
            files.push(fullPath);
            console.log(`  ✅ [FIXED] ${label} → ${filename} (${slideCount} slides)`);
        } else {
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                console.warn(`  📁 Created folder: ${folderPath} (upload ${filename} via Library)`);
            }
            console.warn(`  ❌ [FIXED] ${label} → SKIP (file not found): ${fullPath}`);
        }
    }

    const plotCriteria = (plots || [])[0]?.criteria || (plots || [])[0]?.data || {};
    const addedVaryingPaths = new Set();
    function addVarying(folder, key, label) {
        let fullPath = path.join(templateDir, folder, `${key}.pptx`);
        if (!fs.existsSync(fullPath)) {
            fullPath = findMatchingFile(path.join(templateDir, folder), plotCriteria);
        }
        if (fullPath && !addedVaryingPaths.has(fullPath)) {
            addedVaryingPaths.add(fullPath);
            const slideCount = countSlides(fullPath);
            files.push(fullPath);
            console.log(`  ✅ [VARYING] ${label} → ${path.basename(fullPath)} FOUND & LOADED (${slideCount} slides)`);
        } else if (!fullPath) {
            console.warn(`  ⚠️ [VARYING] ${label} → SKIP (file not found): ${key}.pptx`);
        }
    }

    // Use DB sections when available, else fallback to Feasibility Study defaults
    const sections = presentationType?.sections?.length > 0
        ? [...presentationType.sections].sort((a, b) => (a.order || 0) - (b.order || 0))
        : [
            { folderPath: '01_Cover Page', filename: 'cover.pptx', isVarying: false },
            { folderPath: '02_Table of Contents', filename: 'toc.pptx', isVarying: false },
            { folderPath: '03_Project Background', filename: 'project_background.pptx', isVarying: false },
            { folderPath: '04_Executive Summary', filename: 'executive_summary.pptx', isVarying: false },
            { folderPath: '05_Site Assessment', filename: 'site_assessment.pptx', isVarying: false },
            { folderPath: '06_Market Overview', filename: null, isVarying: true },
            { folderPath: '07_Development Recommendations Part 1', filename: 'devrec_part1.pptx', isVarying: false },
            { folderPath: '08_Development Recommendations Part 2', filename: null, isVarying: true },
            { folderPath: '09_Development Recommendations Part 3', filename: 'devrec_part3.pptx', isVarying: false },
            { folderPath: '10_Financial & Investment Analysis', filename: 'financial_investment_analysis.pptx', isVarying: false },
            { folderPath: '11_Disclaimer', filename: 'disclaimer.pptx', isVarying: false },
        ];

    // Merge order: unvarying → varying(06) → unvarying → varying(08) → unvarying(09) → ...
    for (const sec of sections) {
        const folder = sec.folderPath || sec.folder;
        const label = sec.name || folder;
        if (sec.isVarying && !sec.filename) {
            for (const key of uniqueKeys) {
                addVarying(folder, key, label);
            }
        } else {
            const filename = sec.filename || `${(sec.name || folder).toLowerCase().replace(/\s+/g, '_')}.pptx`;
            addFixed(folder, filename, label);
        }
    }

    if (files.length === 0) throw new Error('No Library files found!');

    // #region agent log
    debugLog('FINAL_FILE_LIST', { count: files.length, files: files.map(f => path.basename(f)) });
    // #endregion

    console.log(`\n  MERGE ORDER (${files.length} files):`);
    files.forEach((f, i) => console.log(`    ${i + 1}. ${path.basename(f)} (${countSlides(f)} slides)`));

    const mergedBuffer = await mergePptxFiles(files);
    const backendRoot = path.join(__dirname, '..', '..');
    const outputDir = path.join(backendRoot, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const safeName = (formData.title || formData.projectName || formData.projectTitle || 'Report').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const outputFile = `${safeName}_${uuidv4().substring(0, 8)}.pptx`;
    const outputPath = path.join(outputDir, outputFile);
    fs.writeFileSync(outputPath, mergedBuffer);

    const formatDate = (val) => {
        if (!val) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };
    const projectName = formData.title || formData.projectName || formData.projectTitle || 'Untitled Project';
    const clientName = formData.clientName || formData.client_name || 'Confidential';
    const dateStr = formData.date ? formatDate(formData.date) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    await replaceTokens(outputPath, {
        '{{PROJECT_NAME}}': projectName, '{{CLIENT_NAME}}': clientName, '{{DATE}}': dateStr,
        '{{Title}}': projectName, '{{Subtitle}}': clientName,
        '{{title}}': projectName, '{{subtitle}}': clientName,
        '{{project_name}}': projectName, '{{client_name}}': clientName,
        '{{TITLE}}': projectName, '{{SUBTITLE}}': clientName,
        '{{YEAR}}': new Date().getFullYear().toString(),
        '{{CITY}}': formData.city || formData.City || '',
        '{{PROPERTY_TYPE}}': formData.propertyType || formData.property_type || '',
        '{{ASSET_CATEGORY}}': formData.assetCategory || formData.asset_category || '',
        '{{NUMBER_OF_UNITS}}': String(formData.numberOfUnits ?? formData.number_of_units ?? formData.units ?? 'TBD'),
        '{{PRICE_RANGE}}': formData.priceRange || formData.price_range || '',
        '{{TOTAL_REVENUE}}': formData.totalRevenue || formData.total_revenue || 'TBD',
        '{{DEV_COST}}': formData.devCost || formData.dev_cost || 'TBD',
        '{{TARGET_IRR}}': formData.targetIRR || formData.target_irr || 'TBD',
        '{{PAYBACK_PERIOD}}': formData.paybackPeriod || formData.payback_period || 'TBD',
    });

    const fileSize = fs.statSync(outputPath).size;
    const slideCount = countSlides(outputPath);
    console.log(`\n  ✅ DONE: ${outputFile} (${slideCount} slides, ${(fileSize / 1024).toFixed(1)} KB)\n`);

    return { fileName: outputFile, filePath: outputPath, fileSize, slideCount };
}

export default { assemblePresentation };