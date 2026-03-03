import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import PizZip from 'pizzip';

// ══════════════════════════════════════════════════════════════════════════════
//  PRESENTATION SERVICE (New) — v5 Bulletproof JSZip merge
//  Used by projectController.js
//  Same logic as presentationServiceEnhanced.js
// ══════════════════════════════════════════════════════════════════════════════

// Value normalization: frontend labels → library filename tokens
const VALUE_MAP = {
    'hotels': 'hotel', 'hotel': 'hotel', 'residential': 'residential', 'office': 'office', 'retail': 'retail',
    '3-star': '3_star', '3 star': '3_star', '4-star': '4_star', '4 star': '4_star',
    '5-star': '5_star', '5 star': '5_star',
    'small regional mall': 'small_regional_mall', 'regional mall': 'regional_mall',
    'community mall': 'community_mall', 'neighbourhood center': 'neighbourhood_center',
    'convenience center': 'convenience_center',
    'beach resort': 'beach_resort', 'business': 'business', 'city': 'city', 'leisure': 'leisure',
    'apartments': 'apartments', 'villas': 'villas', 'townhouses': 'townhouses',
    'luxury': 'luxury', 'high end': 'high_end', 'upper mid end': 'upper_mid_end', 'mid end': 'mid_end',
    'low end': 'low_end', 'affordable': 'affordable', 'social': 'social',
    'grade a': 'grade_a', 'grade b': 'grade_b',
    'abu dhabi': 'abu_dhabi', 'abudhabi': 'abu_dhabi', 'dubai': 'dubai', 'riyadh': 'riyadh', 'jeddah': 'jeddah',
};

function normToken(val) {
    if (!val || typeof val !== 'string') return '';
    const lower = String(val).trim().toLowerCase();
    const withUnderscores = lower.replace(/\s+/g, '_').replace(/-/g, '_');
    return VALUE_MAP[lower] ?? VALUE_MAP[withUnderscores] ?? withUnderscores.replace(/[^a-z0-9_]/g, '');
}

// Build key: city_asset_type_category_specifications (underscore, lowercase, trim)
// Matches filenames like abu_dhabi_hotel_small_regional_mall_city.pptx
function buildKey(criteria) {
    if (!criteria || typeof criteria !== 'object') return '';
    const raw = [
        criteria.City || criteria.city || '',
        criteria['Asset Type'] || criteria.assetType || criteria.asset_type || '',
        criteria.Category || criteria.category || '',
        criteria.Specifications || criteria.specifications || criteria.specs || criteria.spec || '',
    ];
    const parts = raw.map(s => normToken(String(s || '')));
    return parts.filter(s => s.length > 0).join('_');
}

function getUniqueKeys(plots) {
    const uniqueKeys = new Set();
    for (const plot of plots || []) {
        const criteria = plot.criteria || plot.data || plot;
        const key = buildKey(criteria);
        if (key) uniqueKeys.add(key);
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

function getLibraryPath(typeName = 'Feasibility Study') {
    const cwd = process.cwd();
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const libRoot = path.join(cwd, 'Library');
    const candidates = [
        path.join(cwd, 'Library', typeName),
        path.join(cwd, '..', 'Library', typeName),
        path.join(cwd, 'src', 'Library', typeName),
        path.join(__dirname, '..', '..', 'Library', typeName),
        path.join(cwd, 'Library', 'Feasibility Study'),
        path.join(cwd, '..', 'Library', 'Feasibility Study'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    if (fs.existsSync(libRoot)) return path.join(libRoot, typeName);
    throw new Error(`Library folder not found for type: ${typeName}`);
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
        let srcZip;
        try {
            srcZip = await JSZip.loadAsync(fs.readFileSync(fileList[s]));
        } catch (err) { continue; }

        const srcSlides = Object.keys(srcZip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
            .sort((a, b) => parseInt(a.match(/slide(\d+)/)[1]) - parseInt(b.match(/slide(\d+)/)[1]));

        for (const srcSlidePath of srcSlides) {
            const slideFile = srcZip.file(srcSlidePath);
            if (!slideFile || slideFile.dir) continue;

            slideCount++;
            maxRId++;
            maxSldId++;

            outputZip.file(`ppt/slides/slide${slideCount}.xml`, await slideFile.async('string'));

            const srcNum = srcSlidePath.match(/slide(\d+)/)[1];
            const srcRelFile = srcZip.file(`ppt/slides/_rels/slide${srcNum}.xml.rels`);
            if (srcRelFile && !srcRelFile.dir) {
                let relXml = await srcRelFile.async('string');
                for (const mr of relXml.matchAll(/Target="\.\.\/media\/([^"]+)"/g)) {
                    const orig = mr[1];
                    const uniq = `s${s}_${orig}`;
                    relXml = relXml.split(`../media/${orig}`).join(`../media/${uniq}`);
                    const srcMedia = srcZip.file(`ppt/media/${orig}`);
                    if (srcMedia && !srcMedia.dir) {
                        outputZip.file(`ppt/media/${uniq}`, await srcMedia.async('nodebuffer'));
                    }
                }
                outputZip.file(`ppt/slides/_rels/slide${slideCount}.xml.rels`, relXml);
            }

            newSldIdEntries.push(`<p:sldId id="${maxSldId}" r:id="rId${maxRId}"/>`);
            newRelEntries.push(`<Relationship Id="rId${maxRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${slideCount}.xml"/>`);
            newContentTypeEntries.push(`<Override PartName="/ppt/slides/slide${slideCount}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`);
        }
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

export async function assemblePresentation({ presentationType, formData = {}, plots = [], userId }) {
    console.log('\n══════════════════════════════════════════');
    console.log('  ASSEMBLY START (v5 — Bulletproof Merge)');
    console.log('══════════════════════════════════════════');

    // ─── Debug: raw plots from request ───────────────────────────────────────
    console.log('FULL BODY PLOTS RECEIVED:', JSON.stringify(plots, null, 2));
    console.log('Number of plots:', plots?.length || 0);

    const typeName = presentationType?.name || 'Feasibility Study';
    const templateDir = getLibraryPath(typeName);

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

    function addVarying(folder, key, label) {
        const filename = `${key}.pptx`;
        const fullPath = path.join(templateDir, folder, filename);
        if (fs.existsSync(fullPath)) {
            const slideCount = countSlides(fullPath);
            files.push(fullPath);
            console.log(`  ✅ [VARYING] ${label} → ${filename} FOUND & LOADED (${slideCount} slides)`);
        } else {
            console.warn(`  ⚠️ [VARYING] ${label} → SKIP (file not found): ${fullPath}`);
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

    console.log(`\n  MERGE ORDER (${files.length} files):`);
    files.forEach((f, i) => console.log(`    ${i + 1}. ${path.basename(f)} (${countSlides(f)} slides)`));

    const mergedBuffer = await mergePptxFiles(files);
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const safeName = (formData.title || formData.projectName || formData.projectTitle || 'Report').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const outputFile = `${safeName}_${uuidv4().substring(0, 8)}.pptx`;
    const outputPath = path.join(outputDir, outputFile);
    fs.writeFileSync(outputPath, mergedBuffer);

    const projectName = formData.title || formData.projectName || formData.projectTitle || 'Untitled Project';
    const clientName = formData.clientName || formData.client_name || 'Confidential';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    await replaceTokens(outputPath, {
        '{{PROJECT_NAME}}': projectName, '{{CLIENT_NAME}}': clientName, '{{DATE}}': dateStr,
        '{{Title}}': projectName, '{{Subtitle}}': clientName,
        '{{title}}': projectName, '{{subtitle}}': clientName,
        '{{project_name}}': projectName, '{{client_name}}': clientName,
        '{{TITLE}}': projectName, '{{SUBTITLE}}': clientName,
        '{{YEAR}}': new Date().getFullYear().toString(),
    });

    const fileSize = fs.statSync(outputPath).size;
    const slideCount = countSlides(outputPath);
    console.log(`\n  ✅ DONE: ${outputFile} (${slideCount} slides, ${(fileSize / 1024).toFixed(1)} KB)\n`);

    return { fileName: outputFile, filePath: outputPath, fileSize, slideCount };
}

export default { assemblePresentation };