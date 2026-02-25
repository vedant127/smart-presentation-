import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import PizZip from 'pizzip';

// ══════════════════════════════════════════════════════════════════════════════
//  PRESENTATION SERVICE (Legacy) — v5 Bulletproof JSZip merge
//  Same logic as presentationServiceEnhanced.js
// ══════════════════════════════════════════════════════════════════════════════

function makePlotKey(plot) {
    return [
        plot.city || plot.City || '',
        plot.assetType || plot['Asset Type'] || plot.asset_type || '',
        plot.category || plot.Category || '',
        plot.specs || plot.specifications || plot.Specifications || plot.spec || '',
    ]
        .map(s => s.trim())
        .join(' + ')
        .toLowerCase();
}

function getUniquePlots(plots) {
    const seen = new Map();
    for (const plot of plots) {
        const key = makePlotKey(plot);
        if (!seen.has(key)) seen.set(key, plot);
    }
    return Array.from(seen.values());
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

function getLibraryPath() {
    const cwd = process.cwd();
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const candidates = [
        path.join(cwd, 'Library', 'Feasibility Study'),
        path.join(cwd, '..', 'Library', 'Feasibility Study'),
        path.join(cwd, 'src', 'Library', 'Feasibility Study'),
        path.join(__dirname, '..', 'Library', 'Feasibility Study'),
        path.join(__dirname, '..', '..', 'Library', 'Feasibility Study'),
        path.join(cwd, 'Library', 'feasibility_study'),
        path.join(cwd, '..', 'Library', 'feasibility_study'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error(`Library folder not found!`);
}

// ─── Bulletproof Merge ───────────────────────────────────────────────────────
async function mergePptxFiles(fileList) {
    if (fileList.length === 0) throw new Error('No files to merge!');
    if (fileList.length === 1) return fs.readFileSync(fileList[0]);

    const baseBuffer = fs.readFileSync(fileList[0]);
    const outputZip = await JSZip.loadAsync(baseBuffer);

    let slideCount = countSlidesInZip(outputZip);

    // Track max rId in presentation.xml.rels
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

    // Track max sldId in presentation.xml
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

            // Copy slide .rels and rewrite media paths with unique names
            const srcNum = srcSlidePath.match(/slide(\d+)/)[1];
            const srcRelFile = srcZip.file(`ppt/slides/_rels/slide${srcNum}.xml.rels`);
            if (srcRelFile && !srcRelFile.dir) {
                let relXml = await srcRelFile.async('string');
                // Fix: properly extract just the filename from ../media/filename
                for (const mr of relXml.matchAll(/Target="\.\.\/media\/([^"]+)"/g)) {
                    const orig = mr[1]; // e.g. "image1.png"
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

    // Patch Content_Types
    if (newContentTypeEntries.length > 0) {
        const ct = outputZip.file('[Content_Types].xml');
        if (ct) outputZip.file('[Content_Types].xml', (await ct.async('string')).replace('</Types>', newContentTypeEntries.join('') + '</Types>'));
    }

    // Patch presentation.xml
    if (newSldIdEntries.length > 0 && presXml.includes('</p:sldIdLst>')) {
        outputZip.file('ppt/presentation.xml', presXml.replace('</p:sldIdLst>', newSldIdEntries.join('') + '</p:sldIdLst>'));
    }

    // Patch presentation.xml.rels — THIS WAS THE MISSING PIECE CAUSING BLANK SLIDES
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
    const LIBRARY = getLibraryPath();
    const rawPlots = (plots && plots.length > 0) ? plots.map(p => p.criteria || p.data || p) : [formData];
    const uniquePlots = getUniquePlots(rawPlots);

    const files = [];
    function addFixed(folder, filename) { const p = path.join(LIBRARY, folder, filename); if (fs.existsSync(p)) files.push(p); }
    function addVarying(folder, plot) { const k = makePlotKey(plot); const p = path.join(LIBRARY, folder, `${k}.pptx`); if (fs.existsSync(p)) files.push(p); }

    addFixed('01_Cover Page', 'cover.pptx');
    addFixed('02_Table of Contents', 'toc.pptx');
    addFixed('03_Project Background', 'project_background.pptx');
    addFixed('04_Executive Summary', 'executive_summary.pptx');
    addFixed('05_Site Assessment', 'site_assessment.pptx');
    for (const plot of uniquePlots) addVarying('06_Market Overview', plot);
    addFixed('07_Development Recommendations Part 1', 'devrec_part1.pptx');
    for (const plot of uniquePlots) addVarying('08_Development Recommendations Part 2', plot);
    for (const plot of uniquePlots) addVarying('09_Development Recommendations Part 3', plot);
    addFixed('10_Financial & Investment Analysis', 'financial_investment_analysis.pptx');
    addFixed('11_Disclaimer', 'disclaimer.pptx');

    if (files.length === 0) throw new Error('No Library files found!');

    const mergedBuffer = await mergePptxFiles(files);
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const safeName = (formData.title || formData.projectName || 'Report').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const outputFile = `${safeName}_${uuidv4().substring(0, 8)}.pptx`;
    const outputPath = path.join(outputDir, outputFile);
    fs.writeFileSync(outputPath, mergedBuffer);

    const projectName = formData.title || formData.projectName || formData.projectTitle || 'Untitled';
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

    return { fileName: outputFile, filePath: outputPath, fileSize: fs.statSync(outputPath).size, slideCount: countSlides(outputPath) };
}

export const generatePresentation = assemblePresentation;
export const generatePresentationFromTemplate = assemblePresentation;
export default { assemblePresentation, generatePresentation, generatePresentationFromTemplate };
