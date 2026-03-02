import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import PizZip from 'pizzip';

// ─── Locate Library folder ──────────────────────────────────────────────────
function getLibraryPath() {
    const cwd = process.cwd();
    const candidates = [
        path.join(cwd, 'Library', 'Feasibility Study'),
        path.join(cwd, '..', 'Library', 'Feasibility Study'),
        path.join(cwd, 'src', 'Library', 'Feasibility Study')
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return path.join(cwd, 'Library', 'Feasibility Study');
}

// ─── Plot Key ────────────────────────────────────────────────────────────────
// Format: "city + asset type + category + specs" (matches library filenames)
function makePlotKey(plot) {
    return [
        plot.city || plot.City || '',
        plot.assetType || plot['Asset Type'] || plot.asset_type || '',
        plot.category || plot.Category || '',
        plot.specs || plot.specifications || plot.Specifications || plot.spec || ''
    ]
        .map(s => s.trim())
        .join(' + ')
        .toLowerCase();
}

// ─── PPTX Merger Function ───────────────────────────────────────────────────
// Merges multiple PPTX files into a single output using JSZip.
// Keeps ALL original template slides — no filtering.
async function mergePptxFiles(fileList) {
    console.log(`\n[Merge] Starting merge of ${fileList.length} files...`);
    if (fileList.length === 0) throw new Error('No files to merge!');

    const allSlides = [];

    for (let srcIdx = 0; srcIdx < fileList.length; srcIdx++) {
        const filePath = fileList[srcIdx];
        const buffer = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(buffer);
        const fileName = path.basename(filePath);

        const slidePaths = Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
            .sort((a, b) => {
                const na = parseInt(a.match(/(\d+)/)[1]);
                const nb = parseInt(b.match(/(\d+)/)[1]);
                return na - nb;
            });

        for (const slidePath of slidePaths) {
            const slideFile = zip.file(slidePath);
            if (!slideFile || slideFile.dir) continue;

            const slideXml = await slideFile.async('string');
            const srcNum = slidePath.match(/slide(\d+)/)[1];
            const relPath = `ppt/slides/_rels/slide${srcNum}.xml.rels`;
            let relXml = zip.file(relPath) ? await zip.file(relPath).async('string') : null;

            const mediaFiles = {};
            if (relXml) {
                const mediaRefs = [...relXml.matchAll(/Target="\.\.\/media\/([^"]+)"/g)];
                for (const ref of mediaRefs) {
                    const origMediaName = ref[1];
                    const uniqueMediaName = `src${srcIdx}_${origMediaName}`;

                    const srcMediaFile = zip.file(`ppt/media/${origMediaName}`);
                    if (srcMediaFile && !srcMediaFile.dir) {
                        mediaFiles[uniqueMediaName] = await srcMediaFile.async('nodebuffer');
                    }
                    relXml = relXml.split(`../media/${origMediaName}`).join(`../media/${uniqueMediaName}`);
                }
            }

            allSlides.push({ slideXml, relXml, mediaFiles, fileName, sourceIndex: srcIdx });
        }
    }

    if (allSlides.length === 0) throw new Error('No slides found!');

    // Build output ZIP from the first file to retain layouts
    const baseBuffer = fs.readFileSync(fileList[0]);
    const outputZip = await JSZip.loadAsync(baseBuffer);

    // Remove existing slides
    const existingSlides = Object.keys(outputZip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    for (const s of existingSlides) {
        outputZip.remove(s);
        const rel = s.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
        if (outputZip.file(rel)) outputZip.remove(rel);
    }

    // Insert slides
    for (let i = 0; i < allSlides.length; i++) {
        const { slideXml, relXml, mediaFiles } = allSlides[i];
        const slideNum = i + 1;

        outputZip.file(`ppt/slides/slide${slideNum}.xml`, slideXml);
        if (relXml) {
            outputZip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, relXml);
        } else {
            const minimalRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>\n</Relationships>`;
            outputZip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, minimalRels);
        }

        for (const [mediaName, mediaBuffer] of Object.entries(mediaFiles)) {
            outputZip.file(`ppt/media/${mediaName}`, mediaBuffer);
        }
    }

    // Update Content Types
    let contentTypes = await outputZip.file('[Content_Types].xml').async('string');
    contentTypes = contentTypes.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^/]*\/>/g, '');
    let ctEntries = '';
    for (let i = 1; i <= allSlides.length; i++) {
        ctEntries += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    }
    contentTypes = contentTypes.replace('</Types>', `${ctEntries}</Types>`);
    outputZip.file('[Content_Types].xml', contentTypes);

    // Update Presentation XML
    let presXml = await outputZip.file('ppt/presentation.xml').async('string');
    let maxSldId = 255;
    for (const m of presXml.matchAll(/id="(\d+)"/g)) {
        maxSldId = Math.max(maxSldId, parseInt(m[1]));
    }
    let sldIdLst = '';
    for (let i = 1; i <= allSlides.length; i++) {
        maxSldId++;
        sldIdLst += `<p:sldId id="${maxSldId}" r:id="rId_slide${i}"/>`;
    }
    if (presXml.includes('</p:sldIdLst>')) {
        presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIdLst}</p:sldIdLst>`);
    } else {
        presXml = presXml.replace('</p:presentation>', `<p:sldIdLst>${sldIdLst}</p:sldIdLst></p:presentation>`);
    }
    outputZip.file('ppt/presentation.xml', presXml);

    // Update Presentation Rels
    const presRelsPath = 'ppt/_rels/presentation.xml.rels';
    let presRelsXml = outputZip.file(presRelsPath) ? await outputZip.file(presRelsPath).async('string') : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n</Relationships>`;
    presRelsXml = presRelsXml.replace(/<Relationship[^>]*Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/slide"[^>]*\/>/g, '');
    let newSlideRels = '';
    for (let i = 1; i <= allSlides.length; i++) {
        newSlideRels += `<Relationship Id="rId_slide${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`;
    }
    presRelsXml = presRelsXml.replace('</Relationships>', `${newSlideRels}</Relationships>`);
    outputZip.file(presRelsPath, presRelsXml);

    const outputBuffer = await outputZip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    console.log(`[Merge] ✅ Done — ${allSlides.length} slides merged`);
    return outputBuffer;
}

// ─── Token Replacement ───────────────────────────────────────────────────────
async function replaceTokens(pptxPath, replacements) {
    console.log('[Tokens] Replacing placeholders with user data...');
    const buffer = fs.readFileSync(pptxPath);
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));

    let totalReplaced = 0;

    for (const slidePath of slideFiles) {
        const sf = zip.file(slidePath);
        if (!sf || sf.dir) continue;
        let xml = await sf.async('string');
        let modified = false;

        for (const [token, value] of Object.entries(replacements)) {
            if (xml.includes(token)) { xml = xml.split(token).join(value); modified = true; totalReplaced++; }
        }

        for (const [token, value] of Object.entries(replacements)) {
            xml = xml.replace(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/g, (paragraph) => {
                const parts = []; let m;
                const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
                while ((m = re.exec(paragraph)) !== null) parts.push(m[1]);
                const full = parts.join('');
                if (full.includes(token)) {
                    modified = true;
                    totalReplaced++;
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
    console.log(`[Tokens] Done — ${totalReplaced} replacement(s)`);
}

// ─── Main Assembly Service ──────────────────────────────────────────────────
export async function assembleReport(formData, plots) {
    console.log('\n[Assemble Report] Creating final presentation...');

    const LIBRARY = getLibraryPath();
    const filesToMerge = [];

    // 1. Deduplication
    const seenPlots = new Set();
    const uniquePlots = [];

    for (const plot of plots) {
        const key = makePlotKey(plot);

        if (!seenPlots.has(key)) {
            seenPlots.add(key);
            uniquePlots.push({ ...plot, fileKey: key });
            console.log(`[Dedup] 🟢 Unique plot: ${key}`);
        } else {
            console.log(`[Dedup] 🟡 Skipped duplicate: ${key}`);
        }
    }

    // 2. Build file list — safely checking existence
    const safeAppend = (folder, filename) => {
        const fullPath = path.join(LIBRARY, folder, filename);
        if (fs.existsSync(fullPath)) {
            filesToMerge.push(fullPath);
            console.log(`[Files] ✅ FOUND: ${folder}/${filename}`);
        } else {
            console.warn(`[Files] ❌ MISSING: ${folder}/${filename}`);
        }
    };

    // Fixed sections
    safeAppend('01_Cover Page', 'cover.pptx');
    safeAppend('02_Table of Contents', 'toc.pptx');
    safeAppend('03_Project Background', 'project_background.pptx');
    safeAppend('04_Executive Summary', 'executive_summary.pptx');
    safeAppend('05_Site Assessment', 'site_assessment.pptx');

    // Varying sections — use " + " separator matching library filenames
    for (const plot of uniquePlots) {
        safeAppend('06_Market Overview', `${plot.fileKey}.pptx`);
    }

    safeAppend('07_Development Recommendations Part 1', 'devrec_part1.pptx');

    for (const plot of uniquePlots) {
        safeAppend('08_Development Recommendations Part 2', `${plot.fileKey}.pptx`);
    }

    for (const plot of uniquePlots) {
        safeAppend('09_Development Recommendations Part 3', `${plot.fileKey}.pptx`);
    }

    safeAppend('10_Financial & Investment Analysis', 'financial_investment_analysis.pptx');
    safeAppend('11_Disclaimer', 'disclaimer.pptx');

    // 3. Merge
    if (filesToMerge.length === 0) {
        throw new Error('No files gathered to merge! Check Library path and file existence.');
    }

    console.log(`\n[Merge] Initiating merge on ${filesToMerge.length} files...`);
    const finalPptxBuffer = await mergePptxFiles(filesToMerge);

    // 4. Save locally
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const safeName = (formData?.title || 'Report').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const outputFile = `${safeName}_${uuidv4().substring(0, 8)}.pptx`;
    const outputPath = path.join(outputDir, outputFile);
    fs.writeFileSync(outputPath, finalPptxBuffer);

    // 5. Replace placeholders
    const projectName = formData?.title || formData?.projectName || 'Untitled';
    const clientName = formData?.clientName || formData?.client_name || 'Confidential';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    await replaceTokens(outputPath, {
        '{{PROJECT_NAME}}': projectName,
        '{{CLIENT_NAME}}': clientName,
        '{{DATE}}': dateStr,
        '{{Title}}': projectName,
        '{{Subtitle}}': clientName,
        '{{title}}': projectName,
        '{{subtitle}}': clientName,
        '{{project_name}}': projectName,
        '{{client_name}}': clientName,
        '{{TITLE}}': projectName,
        '{{SUBTITLE}}': clientName,
        '{{YEAR}}': new Date().getFullYear().toString(),
    });

    console.log(`[Success] Final PPTX saved at: ${outputPath}`);

    return { filePath: outputPath, fileName: outputFile };
}

export default { assembleReport, mergePptxFiles };
