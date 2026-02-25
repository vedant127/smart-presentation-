import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import PizZip from 'pizzip';

// ══════════════════════════════════════════════════════════════════════════════
//  PRESENTATION ASSEMBLY SERVICE (v5 — Bulletproof JSZip merge)
//
//  Pure file-merge from Library folder.
//  NO AI content. NO pptx-automizer. NO RootTemplate needed.
//  Every slide comes from a real PPTX in the Library.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Plot Key ────────────────────────────────────────────────────────────────
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

// ─── Deduplication ───────────────────────────────────────────────────────────
function getUniquePlots(plots) {
    const seen = new Map();
    for (const plot of plots) {
        const key = makePlotKey(plot);
        if (!seen.has(key)) {
            seen.set(key, plot);
            console.log(`   [Dedup] ✅ Unique: "${key}"`);
        } else {
            console.log(`   [Dedup] ⏭️  Skip duplicate: "${key}"`);
        }
    }
    return Array.from(seen.values());
}

// ─── Locate Library folder ──────────────────────────────────────────────────
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
    throw new Error(`Library folder not found! Tried:\n${candidates.join('\n')}`);
}

// ─── Count slides in a PPTX ─────────────────────────────────────────────────
function countSlidesInZip(zip) {
    return Object.keys(zip.files)
        .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
}

function countSlides(filePath) {
    try {
        const zip = new PizZip(fs.readFileSync(filePath));
        return Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
    } catch { return 0; }
}

// ─── Filter out fake/placeholder slides ──────────────────────────────────────
// Slides containing these texts are fake AI-generated content — skip them
const FAKE_SLIDE_PATTERNS = [
    '[Location Map Placeholder]',
    '[Location Map Reference]',
    '[Process Flow Diagram',
    '[Cash Flow Column Chart Placeholder]',
    'Sensitivity Matrix (Price vs. Cost)',
    'The project yields a Total Profit of $85M',
    'Unlevered IRR: 14%',
    'Market Outlook & Opportunities',
    'Pricing Rationale',
    'Financial Results Summary',
    'Project IRR',
    'Assumptions - Part',
    'METHODOLOGY',
    'CASH FLOW STATEMENTS',
    'RETURN ANALYSIS',
    'SENSITIVITY ANALYSIS',
    'FINANCIAL RESULTS SUMMARY',
];

function isFakeSlide(slideXml) {
    const decoded = slideXml.replace(/&#xD;/g, '').replace(/<[^>]*>/g, ' ');
    return FAKE_SLIDE_PATTERNS.some(pattern => decoded.includes(pattern));
}

// ══════════════════════════════════════════════════════════════════════════════
//  CORE MERGE — Bulletproof version with FAKE SLIDE FILTERING
//
//  Strategy: Collect ALL slides from ALL files, filter out fake/placeholder
//  slides, then build a clean output PPTX with only real slides.
// ══════════════════════════════════════════════════════════════════════════════
async function mergePptxFiles(fileList) {
    console.log(`\n   [Merge] Starting merge of ${fileList.length} files...`);

    if (fileList.length === 0) throw new Error('No files to merge!');

    // Collect all real slides from all files
    const allSlides = []; // { slideXml, relXml, mediaFiles, fileName, sourceIndex }

    for (let srcIdx = 0; srcIdx < fileList.length; srcIdx++) {
        const filePath = fileList[srcIdx];
        const buffer = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(buffer);
        const fileName = path.basename(filePath);

        // Get slides sorted by number
        const slidePaths = Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
            .sort((a, b) => {
                const na = parseInt(a.match(/(\d+)/)[1]);
                const nb = parseInt(b.match(/(\d+)/)[1]);
                return na - nb;
            });

        let kept = 0;
        let skipped = 0;

        for (const slidePath of slidePaths) {
            const slideFile = zip.file(slidePath);
            if (!slideFile || slideFile.dir) continue;

            const slideXml = await slideFile.async('string');

            // ── SKIP FAKE SLIDES ──────────────────────────────────────
            if (isFakeSlide(slideXml)) {
                skipped++;
                console.log(`     ⏭️  SKIPPED fake slide: ${fileName} → ${slidePath}`);
                continue;
            }

            // Get slide relationships
            const srcNum = slidePath.match(/slide(\d+)/)[1];
            const relPath = `ppt/slides/_rels/slide${srcNum}.xml.rels`;
            let relXml = zip.file(relPath) ? await zip.file(relPath).async('string') : null;

            // Get media files referenced by this slide & rename to avoid collisions
            const mediaFiles = {};
            if (relXml) {
                // Match Target="../media/image1.png" style references
                const mediaRefs = [...relXml.matchAll(/Target="\.\.\/media\/([^"]+)"/g)];
                for (const ref of mediaRefs) {
                    const origMediaName = ref[1]; // e.g. "image1.png"
                    const uniqueMediaName = `src${srcIdx}_${origMediaName}`; // unique per source

                    // Read the actual media file from source
                    const srcMediaFile = zip.file(`ppt/media/${origMediaName}`);
                    if (srcMediaFile && !srcMediaFile.dir) {
                        mediaFiles[uniqueMediaName] = await srcMediaFile.async('nodebuffer');
                    }

                    // Update the rels XML to point to the new unique media name
                    relXml = relXml.split(`../media/${origMediaName}`).join(`../media/${uniqueMediaName}`);
                }

                // Also handle slideLayout, slideMaster, theme references
                // These use relative paths like "../slideLayouts/slideLayout1.xml"
                // We keep them as-is since they reference the base template's layouts
            }

            allSlides.push({ slideXml, relXml, mediaFiles, fileName, sourceIndex: srcIdx });
            kept++;
        }

        // Also collect slide layouts & themes from source (we need them for proper rendering)
        // Copy slideLayouts, slideMasters, and theme from each source
        if (srcIdx > 0) {
            // We'll handle layout/master copying separately below
        }

        console.log(`     📄 ${fileName} → kept ${kept}, skipped ${skipped}`);
    }

    if (allSlides.length === 0) throw new Error('No real slides found after filtering!');

    console.log(`   [Merge] Total real slides collected: ${allSlides.length}`);

    // ── Build output PPTX from first file as base ─────────────────────
    const baseBuffer = fs.readFileSync(fileList[0]);
    const outputZip = await JSZip.loadAsync(baseBuffer);

    // Remove ALL existing slides and their rels from the base
    const existingSlides = Object.keys(outputZip.files)
        .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    for (const s of existingSlides) {
        outputZip.remove(s);
        const rel = s.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
        if (outputZip.file(rel)) outputZip.remove(rel);
    }

    // ── Add all real slides with proper numbering ─────────────────────
    for (let i = 0; i < allSlides.length; i++) {
        const { slideXml, relXml, mediaFiles } = allSlides[i];
        const slideNum = i + 1;

        // Write slide XML
        outputZip.file(`ppt/slides/slide${slideNum}.xml`, slideXml);

        // Write slide rels (or create a minimal one if none exists)
        if (relXml) {
            outputZip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, relXml);
        } else {
            // Create a minimal rels file pointing to the first slide layout
            const minimalRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
            outputZip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, minimalRels);
        }

        // Add media files (already uniquely named per source)
        for (const [mediaName, mediaBuffer] of Object.entries(mediaFiles)) {
            outputZip.file(`ppt/media/${mediaName}`, mediaBuffer);
        }
    }

    // ── Update [Content_Types].xml ───────────────────────────────────
    let contentTypes = await outputZip.file('[Content_Types].xml').async('string');
    // Remove ALL old slide override entries
    contentTypes = contentTypes.replace(
        /<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^/]*\/>/g, ''
    );
    // Add new slide entries
    let ctEntries = '';
    for (let i = 1; i <= allSlides.length; i++) {
        ctEntries += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    }
    contentTypes = contentTypes.replace('</Types>', `${ctEntries}</Types>`);
    outputZip.file('[Content_Types].xml', contentTypes);

    // ── Update ppt/presentation.xml ─────────────────────────────────
    let presXml = await outputZip.file('ppt/presentation.xml').async('string');

    // Find max existing numeric id (for sldId)
    let maxSldId = 255;
    for (const m of presXml.matchAll(/id="(\d+)"/g)) {
        maxSldId = Math.max(maxSldId, parseInt(m[1]));
    }

    // Build new sldIdLst with unique rIds
    let sldIdLst = '';
    for (let i = 1; i <= allSlides.length; i++) {
        maxSldId++;
        sldIdLst += `<p:sldId id="${maxSldId}" r:id="rId_slide${i}"/>`;
    }

    if (presXml.includes('</p:sldIdLst>')) {
        presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIdLst}</p:sldIdLst>`);
    } else {
        // If sldIdLst doesn't exist, add it before </p:presentation>
        presXml = presXml.replace('</p:presentation>', `<p:sldIdLst>${sldIdLst}</p:sldIdLst></p:presentation>`);
    }
    outputZip.file('ppt/presentation.xml', presXml);

    // ══════════════════════════════════════════════════════════════════
    //  FIX: UPDATE ppt/_rels/presentation.xml.rels WITH SLIDE ENTRIES
    //  Without this, PowerPoint can't find the slides → BLANK output!
    // ══════════════════════════════════════════════════════════════════
    const presRelsPath = 'ppt/_rels/presentation.xml.rels';
    let presRelsXml = '';
    const presRelsFile = outputZip.file(presRelsPath);
    if (presRelsFile) {
        presRelsXml = await presRelsFile.async('string');
    } else {
        // Create a minimal rels file
        presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
    }

    // Remove ALL old slide relationships from presentation.xml.rels
    presRelsXml = presRelsXml.replace(
        /<Relationship[^>]*Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/slide"[^>]*\/>/g,
        ''
    );

    // Add NEW slide relationship entries matching the rId_slide1, rId_slide2, etc.
    let newSlideRels = '';
    for (let i = 1; i <= allSlides.length; i++) {
        newSlideRels += `<Relationship Id="rId_slide${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`;
    }

    // Insert before closing </Relationships>
    presRelsXml = presRelsXml.replace('</Relationships>', `${newSlideRels}</Relationships>`);
    outputZip.file(presRelsPath, presRelsXml);

    // ── Generate output buffer ──────────────────────────────────────
    const outputBuffer = await outputZip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    console.log(`   [Merge] ✅ Done — ${allSlides.length} real slides merged`);
    return outputBuffer;
}

// ─── Token Replacement ────────────────────────────────────────────────────────
async function replaceTokens(pptxPath, replacements) {
    console.log('   [Tokens] Replacing tokens...');
    const buffer = fs.readFileSync(pptxPath);
    const zip = await JSZip.loadAsync(buffer);

    const slideFiles = Object.keys(zip.files)
        .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));

    let totalReplaced = 0;

    for (const slidePath of slideFiles) {
        const slideFile = zip.file(slidePath);
        if (!slideFile || slideFile.dir) continue;

        let xml = await slideFile.async('string');
        let modified = false;

        for (const [token, value] of Object.entries(replacements)) {
            if (xml.includes(token)) {
                xml = xml.split(token).join(value);
                modified = true;
                totalReplaced++;
                console.log(`     ✅ Replaced "${token}" in ${slidePath}`);
            }
        }

        // Handle split tokens across XML runs (PowerPoint splits {{TOKEN}} across <a:r> runs)
        for (const [token, value] of Object.entries(replacements)) {
            const paragraphRegex = /<a:p\b[^>]*>[\s\S]*?<\/a:p>/g;
            xml = xml.replace(paragraphRegex, (paragraph) => {
                const textParts = [];
                const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
                let m;
                while ((m = textRegex.exec(paragraph)) !== null) textParts.push(m[1]);
                const fullText = textParts.join('');
                if (fullText.includes(token)) {
                    modified = true;
                    totalReplaced++;
                    const replaced = fullText.split(token).join(value);
                    let firstRun = true;
                    return paragraph.replace(/<a:r\b[^>]*>[\s\S]*?<\/a:r>/g, (run) => {
                        if (firstRun) {
                            firstRun = false;
                            return run.replace(/<a:t[^>]*>[\s\S]*?<\/a:t>/, `<a:t>${replaced}</a:t>`);
                        }
                        const runText = run.replace(/<[^>]*>/g, '').trim();
                        if (token.includes(runText) || runText.includes('{') || runText.includes('}')) return '';
                        return run;
                    });
                }
                return paragraph;
            });
        }

        if (modified) zip.file(slidePath, xml);
    }

    const output = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(pptxPath, output);
    console.log(`   [Tokens] Done — ${totalReplaced} replacement(s)`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN ASSEMBLY FUNCTION
// ══════════════════════════════════════════════════════════════════════════════
export async function assemblePresentation({ presentationType, formData = {}, plots = [], userId }) {
    console.log('\n══════════════════════════════════════════');
    console.log('  ASSEMBLY START (v5 — Bulletproof Merge)');
    console.log('══════════════════════════════════════════');

    const LIBRARY = getLibraryPath();
    console.log(`   Library: ${LIBRARY}`);

    // ── 1. Normalize plots ──────────────────────────────────────────────
    const rawPlots = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];

    // ── 2. Deduplicate ──────────────────────────────────────────────────
    const uniquePlots = getUniquePlots(rawPlots);
    console.log(`   Plots: ${rawPlots.length} total → ${uniquePlots.length} unique\n`);

    // ── 3. Build ordered file list ──────────────────────────────────────
    const files = [];

    function addFixed(folder, filename, label) {
        const p = path.join(LIBRARY, folder, filename);
        if (fs.existsSync(p)) {
            files.push(p);
            console.log(`     ✅ FOUND:   ${label} → ${filename}`);
        } else {
            console.warn(`     ❌ MISSING: ${label} → ${p}`);
        }
    }

    function addVarying(folder, plot, label) {
        const key = makePlotKey(plot);
        const p = path.join(LIBRARY, folder, `${key}.pptx`);
        if (fs.existsSync(p)) {
            files.push(p);
            console.log(`     ✅ FOUND:   ${label} [${key}]`);
        } else {
            console.warn(`     ❌ MISSING: ${label} [${key}] → ${p}`);
        }
    }

    addFixed('01_Cover Page', 'cover.pptx', 'Cover Page');
    addFixed('02_Table of Contents', 'toc.pptx', 'Table of Contents');
    addFixed('03_Project Background', 'project_background.pptx', 'Project Background');
    addFixed('04_Executive Summary', 'executive_summary.pptx', 'Executive Summary');
    addFixed('05_Site Assessment', 'site_assessment.pptx', 'Site Assessment');

    for (const plot of uniquePlots) {
        addVarying('06_Market Overview', plot, 'Market Overview');
    }

    addFixed('07_Development Recommendations Part 1', 'devrec_part1.pptx', 'Dev Recs Part 1');

    for (const plot of uniquePlots) {
        addVarying('08_Development Recommendations Part 2', plot, 'Dev Recs Part 2');
    }

    for (const plot of uniquePlots) {
        addVarying('09_Development Recommendations Part 3', plot, 'Dev Recs Part 3');
    }
    addFixed('10_Financial & Investment Analysis', 'financial_investment_analysis.pptx', 'Financial Analysis');
    addFixed('11_Disclaimer', 'disclaimer.pptx', 'Disclaimer');

    console.log(`\n   Files to merge: ${files.length}`);
    if (files.length === 0) throw new Error('No Library files found! Check Library folder.');

    // ── 4. Merge all files ──────────────────────────────────────────────
    const mergedBuffer = await mergePptxFiles(files);

    // ── 5. Write output ─────────────────────────────────────────────────
    const baseDir = process.cwd();
    const outputDir = path.join(baseDir, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const safeName = (formData.title || formData.projectName || formData.projectTitle || 'Report')
        .replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const outputFile = `${safeName}_${uuidv4().substring(0, 8)}.pptx`;
    const outputPath = path.join(outputDir, outputFile);
    fs.writeFileSync(outputPath, mergedBuffer);

    // ── 6. Replace tokens on cover page ────────────────────────────────
    const projectName = formData.title || formData.projectName || formData.projectTitle || 'Untitled Project';
    const clientName = formData.clientName || formData.client_name || 'Confidential';
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

    // ── 7. Done ─────────────────────────────────────────────────────────
    const fileSize = fs.statSync(outputPath).size;
    const slideCount = countSlides(outputPath);

    console.log('\n══════════════════════════════════════════');
    console.log(`  ✅ ASSEMBLY COMPLETE`);
    console.log(`  File  : ${outputFile}`);
    console.log(`  Slides: ${slideCount}`);
    console.log(`  Size  : ${(fileSize / 1024).toFixed(1)} KB`);
    console.log('══════════════════════════════════════════\n');

    return { fileName: outputFile, filePath: outputPath, fileSize, slideCount };
}

export const generatePresentation = assemblePresentation;
export const generatePresentationFromTemplate = assemblePresentation;
export default { assemblePresentation, generatePresentation, generatePresentationFromTemplate };
