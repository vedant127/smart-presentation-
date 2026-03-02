import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import PizZip from 'pizzip';

// ══════════════════════════════════════════════════════════════════════════════
//  PRESENTATION ASSEMBLY SERVICE (v6 — DB-Driven, Template-Only)
//
//  Pure file-merge from Library folder.
//  NO AI content. NO fake slide filtering. NO random slides.
//  Every slide comes ONLY from the original PPTX templates in the Library.
//  Section order & file paths are read from the DB PresentationType.sections.
//  Placeholders like {{PROJECT_NAME}} are replaced with real user data.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Plot Key ────────────────────────────────────────────────────────────────
// Generates the filename key for varying sections.
// Output format: "city + asset type + category + specs" (matches library filenames)
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
// Searches for the Library/<PresentationType> folder in common locations.
// Falls back to "Feasibility Study" if no presentationType name is given.
function getLibraryPath(presentationTypeName) {
    const cwd = process.cwd();
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const typeName = presentationTypeName || 'Feasibility Study';

    const candidates = [
        path.join(cwd, 'Library', typeName),
        path.join(cwd, '..', 'Library', typeName),
        path.join(cwd, 'src', 'Library', typeName),
        path.join(__dirname, '..', 'Library', typeName),
        path.join(__dirname, '..', '..', 'Library', typeName),
        // Also try lowercase with underscores
        path.join(cwd, 'Library', typeName.toLowerCase().replace(/\s+/g, '_')),
        path.join(cwd, '..', 'Library', typeName.toLowerCase().replace(/\s+/g, '_')),
        // Also try the root library folder
        path.join(cwd, '..', 'library', typeName.toLowerCase().replace(/\s+/g, '_')),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error(`Library folder not found for "${typeName}"! Tried:\n${candidates.join('\n')}`);
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

// ══════════════════════════════════════════════════════════════════════════════
//  CORE MERGE — Keeps ALL original template slides (no filtering)
//
//  Strategy: Collect ALL slides from ALL PPTX files in order,
//  then build a clean output PPTX. Only original template slides are used.
// ══════════════════════════════════════════════════════════════════════════════
async function mergePptxFiles(fileList) {
    console.log(`\n   [Merge] Starting merge of ${fileList.length} files...`);

    if (fileList.length === 0) throw new Error('No files to merge!');

    // Collect ALL slides from all files (no filtering — template slides only)
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

        for (const slidePath of slidePaths) {
            const slideFile = zip.file(slidePath);
            if (!slideFile || slideFile.dir) continue;

            const slideXml = await slideFile.async('string');

            // Get slide relationships
            const srcNum = slidePath.match(/slide(\d+)/)[1];
            const relPath = `ppt/slides/_rels/slide${srcNum}.xml.rels`;
            let relXml = zip.file(relPath) ? await zip.file(relPath).async('string') : null;

            // Get media files referenced by this slide & rename to avoid collisions
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
            kept++;
        }

        console.log(`     📄 ${fileName} → ${kept} slide(s) collected`);
    }

    if (allSlides.length === 0) throw new Error('No slides found in any template file!');

    console.log(`   [Merge] Total slides collected: ${allSlides.length}`);

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

    // ── Add all slides with proper numbering ─────────────────────
    for (let i = 0; i < allSlides.length; i++) {
        const { slideXml, relXml, mediaFiles } = allSlides[i];
        const slideNum = i + 1;

        outputZip.file(`ppt/slides/slide${slideNum}.xml`, slideXml);

        if (relXml) {
            outputZip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, relXml);
        } else {
            const minimalRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
            outputZip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, minimalRels);
        }

        for (const [mediaName, mediaBuffer] of Object.entries(mediaFiles)) {
            outputZip.file(`ppt/media/${mediaName}`, mediaBuffer);
        }
    }

    // ── Update [Content_Types].xml ───────────────────────────────────
    let contentTypes = await outputZip.file('[Content_Types].xml').async('string');
    contentTypes = contentTypes.replace(
        /<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^/]*\/>/g, ''
    );
    let ctEntries = '';
    for (let i = 1; i <= allSlides.length; i++) {
        ctEntries += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    }
    contentTypes = contentTypes.replace('</Types>', `${ctEntries}</Types>`);
    outputZip.file('[Content_Types].xml', contentTypes);

    // ── Update ppt/presentation.xml ─────────────────────────────────
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

    // ── Update ppt/_rels/presentation.xml.rels ──────────────────────
    const presRelsPath = 'ppt/_rels/presentation.xml.rels';
    let presRelsXml = '';
    const presRelsFile = outputZip.file(presRelsPath);
    if (presRelsFile) {
        presRelsXml = await presRelsFile.async('string');
    } else {
        presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
    }

    presRelsXml = presRelsXml.replace(
        /<Relationship[^>]*Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/slide"[^>]*\/>/g,
        ''
    );

    let newSlideRels = '';
    for (let i = 1; i <= allSlides.length; i++) {
        newSlideRels += `<Relationship Id="rId_slide${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`;
    }

    presRelsXml = presRelsXml.replace('</Relationships>', `${newSlideRels}</Relationships>`);
    outputZip.file(presRelsPath, presRelsXml);

    // ── Generate output buffer ──────────────────────────────────────
    const outputBuffer = await outputZip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    console.log(`   [Merge] ✅ Done — ${allSlides.length} slides merged`);
    return outputBuffer;
}

// ─── Token Replacement ────────────────────────────────────────────────────────
// Replaces placeholder tokens like {{PROJECT_NAME}} with actual user data
// in all slide XML files inside the PPTX.
async function replaceTokens(pptxPath, replacements) {
    console.log('   [Tokens] Replacing placeholders with user data...');
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

        // Pass 1: Direct token replacement (simple cases)
        for (const [token, value] of Object.entries(replacements)) {
            if (xml.includes(token)) {
                xml = xml.split(token).join(value);
                modified = true;
                totalReplaced++;
                console.log(`     ✅ Replaced "${token}" in ${slidePath}`);
            }
        }

        // Pass 2: Handle split tokens across XML runs
        // PowerPoint often splits {{TOKEN}} across multiple <a:r> runs like:
        //   <a:r><a:t>{{</a:t></a:r><a:r><a:t>PROJECT_NAME</a:t></a:r><a:r><a:t>}}</a:t></a:r>
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
//
//  Reads section definitions from the DB (presentationType.sections),
//  finds the corresponding PPTX files in the Library folder,
//  merges them, and replaces placeholders with user data.
//
//  NO AI. NO random slides. ONLY original template slides.
// ══════════════════════════════════════════════════════════════════════════════
export async function assemblePresentation({ presentationType, formData = {}, plots = [], userId }) {
    console.log('\n══════════════════════════════════════════');
    console.log('  ASSEMBLY START (v6 — DB-Driven, Template-Only)');
    console.log('══════════════════════════════════════════');

    // Get the presentation type name for library path lookup
    const typeName = presentationType.name || 'Feasibility Study';
    const LIBRARY = getLibraryPath(typeName);
    console.log(`   Library: ${LIBRARY}`);

    // ── 1. Get sections from DB (sorted by order) ───────────────────────
    const sections = (presentationType.sections || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (sections.length === 0) {
        throw new Error(`No sections defined for presentation type "${typeName}". Please configure sections in the database.`);
    }
    console.log(`   Sections from DB: ${sections.length}`);

    // ── 2. Normalize plots ──────────────────────────────────────────────
    const rawPlots = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];

    // ── 3. Deduplicate ──────────────────────────────────────────────────
    const uniquePlots = getUniquePlots(rawPlots);
    console.log(`   Plots: ${rawPlots.length} total → ${uniquePlots.length} unique\n`);

    // ── 4. Build ordered file list from DB sections ─────────────────────
    const files = [];

    for (const section of sections) {
        const folderPath = section.folderPath || section.name;
        const isVarying = section.isVarying || false;
        const sectionName = section.name;

        if (isVarying) {
            // ── VARYING SECTION: one file per unique plot combination ──
            for (const plot of uniquePlots) {
                const key = makePlotKey(plot);
                const fileName = `${key}.pptx`;
                const fullPath = path.join(LIBRARY, folderPath, fileName);

                if (fs.existsSync(fullPath)) {
                    files.push(fullPath);
                    console.log(`     ✅ FOUND:   ${sectionName} [${key}]`);
                } else {
                    console.warn(`     ❌ MISSING: ${sectionName} [${key}] → ${fullPath}`);
                }
            }
        } else {
            // ── FIXED SECTION: single static file ──
            // Use the filename from DB, or try common naming conventions
            const possibleFilenames = [];

            if (section.filename) {
                possibleFilenames.push(section.filename);
            }

            // Also try common auto-generated names based on section name
            const sanitizedName = sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
            possibleFilenames.push(`${sanitizedName}.pptx`);

            // Try to find the file
            let found = false;
            for (const fname of possibleFilenames) {
                const fullPath = path.join(LIBRARY, folderPath, fname);
                if (fs.existsSync(fullPath)) {
                    files.push(fullPath);
                    console.log(`     ✅ FOUND:   ${sectionName} → ${fname}`);
                    found = true;
                    break;
                }
            }

            // If no specific file found, try to find ANY .pptx file in the folder
            if (!found) {
                const folderFullPath = path.join(LIBRARY, folderPath);
                if (fs.existsSync(folderFullPath)) {
                    const pptxFiles = fs.readdirSync(folderFullPath)
                        .filter(f => f.endsWith('.pptx'))
                        .sort();
                    if (pptxFiles.length > 0) {
                        const fullPath = path.join(folderFullPath, pptxFiles[0]);
                        files.push(fullPath);
                        console.log(`     ✅ FOUND:   ${sectionName} → ${pptxFiles[0]} (auto-detected)`);
                        found = true;
                    }
                }
            }

            if (!found) {
                console.warn(`     ❌ MISSING: ${sectionName} → No PPTX found in ${folderPath}`);
            }
        }
    }

    console.log(`\n   Files to merge: ${files.length}`);
    if (files.length === 0) throw new Error('No Library files found! Check Library folder structure and section configuration.');

    // ── 5. Merge all files ──────────────────────────────────────────────
    const mergedBuffer = await mergePptxFiles(files);

    // ── 6. Write output ─────────────────────────────────────────────────
    const baseDir = process.cwd();
    const outputDir = path.join(baseDir, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const safeName = (formData.title || formData.projectName || formData.projectTitle || 'Report')
        .replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const outputFile = `${safeName}_${uuidv4().substring(0, 8)}.pptx`;
    const outputPath = path.join(outputDir, outputFile);
    fs.writeFileSync(outputPath, mergedBuffer);

    // ── 7. Replace placeholders with actual user data ───────────────────
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

    // ── 8. Done ─────────────────────────────────────────────────────────
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
