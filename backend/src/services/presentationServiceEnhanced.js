import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import PizZip from 'pizzip';

// ══════════════════════════════════════════════════════════════════════════════
//  PRESENTATION SERVICE — v9 FINAL (JSZip raw-merge, max 11 slides)
//
//  Strategy:
//   - Merges existing .pptx Library files using raw JSZip merge (reliable)
//   - Translates frontend form values → exact library filename keys
//   - For varying sections 08/09, falls back to section 06 file if missing
//   - Caps final output to MAX_SLIDES slides
// ══════════════════════════════════════════════════════════════════════════════

const MAX_SLIDES = 500; // No artificial cap — use all slides from selected templates

// ─── SECTION CONFIG ──────────────────────────────────────────────────────────
const SECTION_CONFIG = [
    { order: 1, folder: '01_Cover Page', file: 'cover.pptx', varying: false },
    { order: 2, folder: '02_Table of Contents', file: 'toc.pptx', varying: false },
    { order: 3, folder: '03_Project Background', file: 'project_background.pptx', varying: false },
    { order: 4, folder: '04_Executive Summary', file: 'executive_summary.pptx', varying: false },
    { order: 5, folder: '05_Site Assessment', file: 'site_assessment.pptx', varying: false },
    { order: 6, folder: '06_Market Overview', file: null, varying: true },
    { order: 7, folder: '07_Development Recommendations Part 1', file: 'devrec_part1.pptx', varying: false },
    { order: 8, folder: '08_Development Recommendations Part 2', file: null, varying: true, fallbackFolder: '06_Market Overview' },
    { order: 9, folder: '09_Development Recommendations Part 3', file: 'devrec_part3.pptx', varying: false },
    { order: 10, folder: '10_Financial & Investment Analysis', file: 'financial_investment_analysis.pptx', varying: false },
    { order: 11, folder: '11_Disclaimer', file: 'disclaimer.pptx', varying: false },
];

// ─── VALUE NORMALIZATION MAP ──────────────────────────────────────────────────
// Maps frontend display values → exact token used in library filenames
// Frontend sends: "Hotels", "5-star", "Apartments", "Luxury" etc.
// Library files:  "hotel",  "5_star", "apartments",  "luxury" etc.
const VALUE_MAP = {
    // Cities
    'abu dhabi': 'abu_dhabi',
    'abudhabi': 'abu_dhabi',
    'dubai': 'dubai',
    'riyadh': 'riyadh',
    'jeddah': 'jeddah',

    // Asset Types (frontend label → library token)
    'hotels': 'hotel',
    'hotel': 'hotel',
    'residential': 'residential',
    'office': 'office',
    'offices': 'office',
    'retail': 'retail',
    'retails': 'retail',

    // Hotel categories
    '3-star': '3_star',
    '3 star': '3_star',
    '3star': '3_star',
    '4-star': '4_star',
    '4 star': '4_star',
    '4star': '4_star',
    '5-star': '5_star',
    '5 star': '5_star',
    '5star': '5_star',

    // Hotel specs
    'business': 'business',
    'city': 'city',
    'leisure': 'leisure',
    'beach resort': 'beach_resort',
    'beach_resort': 'beach_resort',
    'beachresort': 'beach_resort',

    // Office grades
    'grade a': 'grade_a',
    'grade-a': 'grade_a',
    'grade_a': 'grade_a',
    'a': 'grade_a',
    'grade b': 'grade_b',
    'grade-b': 'grade_b',
    'grade_b': 'grade_b',
    'b': 'grade_b',

    // Office/Retail subtypes
    'high rise': 'high_rise',
    'high-rise': 'high_rise',
    'high_rise': 'high_rise',
    'mid rise': 'mid_rise',
    'mid-rise': 'mid_rise',
    'mid_rise': 'mid_rise',
    'low rise': 'low_rise',
    'low-rise': 'low_rise',
    'low_rise': 'low_rise',
    'business park': 'business_park',
    'business_park': 'business_park',

    // Retail subtypes
    'regional mall': 'regional_mall',
    'regional_mall': 'regional_mall',
    'small regional mall': 'small_regional_mall',
    'community mall': 'community_mall',
    'community_mall': 'community_mall',
    'neighbourhood center': 'neighbourhood_center',
    'neighborhood center': 'neighbourhood_center',
    'convenience center': 'convenience_center',

    // Residential sub-asset types
    'apartments': 'apartments',
    'apartment': 'apartments',
    'villas': 'villas',
    'villa': 'villas',
    'townhouses': 'townhouses',
    'townhouse': 'townhouses',

    // Residential price specs
    'luxury': 'luxury',
    'high end': 'high_end',
    'high-end': 'high_end',
    'high_end': 'high_end',
    'mid end': 'mid_end',
    'mid-end': 'mid_end',
    'mid_end': 'mid_end',
    'upper mid end': 'upper_mid_end',
    'upper mid-end': 'upper_mid_end',
    'upper_mid_end': 'upper_mid_end',
    'low end': 'low_end',
    'low-end': 'low_end',
    'low_end': 'low_end',
    'affordable': 'affordable',
    'social': 'social',
};

// ─── NORMALIZE TOKEN ─────────────────────────────────────────────────────────
// Convert any value to its library filename token:
// 1. Try the VALUE_MAP first (most reliable)
// 2. Fallback: lowercase + replace spaces/hyphens with underscores
function normToken(val) {
    if (!val || typeof val !== 'string') return '';
    const lower = val.trim().toLowerCase();
    if (VALUE_MAP[lower] !== undefined) return VALUE_MAP[lower];
    // Generic fallback
    return lower.replace(/\s+/g, '_').replace(/-/g, '_').replace(/[^a-z0-9_]/g, '');
}

// ─── BUILD PLOT KEY ──────────────────────────────────────────────────────────
// city + assetType + category + specs → "dubai_hotel_5_star_business"
function makePlotKey(plot) {
    const city = normToken(plot.City || plot.city || '');
    const asset = normToken(plot['Asset Type'] || plot.assetType || plot.asset_type || '');
    const cat = normToken(plot.Category || plot.category || '');
    const spec = normToken(plot.Specifications || plot.specifications || plot.specs || plot.spec || '');

    const parts = [city, asset, cat, spec].filter(Boolean);
    const key = parts.join('_');
    console.log(`   [Key] "${key}" (city="${city}" asset="${asset}" cat="${cat}" spec="${spec}")`);
    return key;
}

// ─── DEDUPLICATE PLOTS ───────────────────────────────────────────────────────
function deduplicatePlots(plots) {
    const seen = new Set();
    const unique = [];
    for (const plot of plots) {
        const key = makePlotKey(plot);
        if (key && !seen.has(key)) {
            seen.add(key);
            unique.push({ ...plot, _key: key });
            console.log(`   [Dedup] ✅ Keep:  "${key}"`);
        } else if (!key) {
            console.warn(`   [Dedup] ⚠️  Plot has no valid key, skipping`);
        } else {
            console.log(`   [Dedup] ⏭️  Skip: "${key}" (duplicate)`);
        }
    }
    return unique;
}

// ─── COUNT SLIDES IN PPTX ───────────────────────────────────────────────────
function countSlides(filePath) {
    try {
        const zip = new PizZip(fs.readFileSync(filePath));
        return Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
    } catch { return 0; }
}

// ─── LOCATE LIBRARY ─────────────────────────────────────────────────────────
function getLibraryPath(typeName) {
    const name = typeName || 'Feasibility Study';
    const cwd = process.cwd();
    const candidates = [
        path.join(cwd, 'Library', name),
        path.join(cwd, '..', 'Library', name),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error(`Library not found for "${name}". Tried:\n${candidates.join('\n')}`);
}

// ─── RESOLVE FIXED FILE ─────────────────────────────────────────────────────
function resolveFixedFile(libraryDir, section) {
    const folderPath = path.join(libraryDir, section.folder);
    if (!fs.existsSync(folderPath)) {
        console.warn(`   ❌ FOLDER MISSING: ${section.folder}/`);
        return null;
    }
    if (section.file) {
        const exact = path.join(folderPath, section.file);
        if (fs.existsSync(exact)) return exact;
    }
    // Fallback: first .pptx
    const pptxFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.pptx')).sort();
    if (pptxFiles.length > 0) return path.join(folderPath, pptxFiles[0]);
    console.warn(`   ❌ NO .pptx IN: ${section.folder}/`);
    return null;
}

// ─── RESOLVE VARYING FILES ───────────────────────────────────────────────────
// Returns array of absolute paths for each unique plot.
// If a file is missing in the primary folder, tries the fallbackFolder.
function resolveVaryingFiles(libraryDir, section, uniquePlots) {
    const folderPath = path.join(libraryDir, section.folder);
    const fallbackPath = section.fallbackFolder ? path.join(libraryDir, section.fallbackFolder) : null;
    const results = [];

    for (const plot of uniquePlots) {
        const key = plot._key;
        const fileName = `${key}.pptx`;

        // 1. Try primary folder
        if (fs.existsSync(folderPath)) {
            const primary = path.join(folderPath, fileName);
            if (fs.existsSync(primary)) {
                results.push({ absPath: primary, key });
                console.log(`   ✅ [${section.folder}] → ${fileName}`);
                continue;
            }
        }

        // 2. Try fallback folder (e.g., 06_Market Overview)
        if (fallbackPath && fs.existsSync(fallbackPath)) {
            const fallback = path.join(fallbackPath, fileName);
            if (fs.existsSync(fallback)) {
                results.push({ absPath: fallback, key });
                console.log(`   ⚠️  [${section.folder}] → ${fileName} NOT FOUND, using fallback from ${section.fallbackFolder}`);
                continue;
            }
        }

        console.warn(`   ❌ [${section.folder}] → ${fileName} NOT FOUND in primary or fallback (skipped)`);
    }
    return results;
}

// ─── MERGE PPTX FILES ────────────────────────────────────────────────────────
// Raw JSZip-based merge. Preserves all media, layouts, themes from each source.
async function mergePptxFiles(fileList, maxSlides) {
    console.log(`\n[Merge] Starting merge of ${fileList.length} files (cap: ${maxSlides} slides)...`);
    if (fileList.length === 0) throw new Error('No files to merge!');

    let totalAdded = 0;
    const allSlides = [];

    for (let srcIdx = 0; srcIdx < fileList.length; srcIdx++) {
        if (totalAdded >= maxSlides) {
            console.log(`   [Merge] Slide cap (${maxSlides}) reached, skipping rest.`);
            break;
        }

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
            if (totalAdded >= maxSlides) break;

            const slideFile = zip.file(slidePath);
            if (!slideFile || slideFile.dir) continue;

            const slideXml = await slideFile.async('string');
            const srcNum = slidePath.match(/slide(\d+)/)[1];
            const relPath = `ppt/slides/_rels/slide${srcNum}.xml.rels`;
            let relXml = zip.file(relPath) ? await zip.file(relPath).async('string') : null;

            // Collect media referenced by this slide
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
            totalAdded++;
        }
    }

    if (allSlides.length === 0) throw new Error('No slides found in any source file!');
    console.log(`[Merge] Collected ${allSlides.length} slides`);

    // Build output ZIP from first file (retains master/layouts/themes)
    const baseBuffer = fs.readFileSync(fileList[0]);
    const outputZip = await JSZip.loadAsync(baseBuffer);

    // Remove existing slides from base
    const existingSlides = Object.keys(outputZip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    for (const s of existingSlides) {
        outputZip.remove(s);
        const rel = s.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
        if (outputZip.file(rel)) outputZip.remove(rel);
    }

    // Remove existing media to avoid conflicts
    const existingMedia = Object.keys(outputZip.files).filter(f => f.startsWith('ppt/media/'));
    for (const m of existingMedia) outputZip.remove(m);

    // Insert all merged slides
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

    // Update [Content_Types].xml
    let contentTypes = await outputZip.file('[Content_Types].xml').async('string');
    contentTypes = contentTypes.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^/]*\/>/g, '');
    let ctEntries = '';
    for (let i = 1; i <= allSlides.length; i++) {
        ctEntries += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    }
    contentTypes = contentTypes.replace('</Types>', `${ctEntries}</Types>`);
    outputZip.file('[Content_Types].xml', contentTypes);

    // Update ppt/presentation.xml slide list
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

    // Update ppt/_rels/presentation.xml.rels
    const presRelsPath = 'ppt/_rels/presentation.xml.rels';
    let presRelsXml = outputZip.file(presRelsPath)
        ? await outputZip.file(presRelsPath).async('string')
        : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n</Relationships>`;
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

// ─── TOKEN REPLACEMENT ───────────────────────────────────────────────────────
async function replaceTokens(pptxPath, replacements) {
    console.log('   [Tokens] Replacing placeholders...');
    const buffer = fs.readFileSync(pptxPath);
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
        .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));

    let count = 0;
    for (const slidePath of slideFiles) {
        const sf = zip.file(slidePath);
        if (!sf || sf.dir) continue;
        let xml = await sf.async('string');
        let modified = false;

        // Direct replacement (tokens appear as-is)
        for (const [token, value] of Object.entries(replacements)) {
            if (xml.includes(token)) {
                xml = xml.split(token).join(value);
                modified = true;
                count++;
            }
        }

        // Split-token replacement (PowerPoint breaks {{TOKEN}} across <a:r> runs)
        for (const [token, value] of Object.entries(replacements)) {
            xml = xml.replace(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/g, (para) => {
                const parts = [];
                let m;
                const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
                while ((m = re.exec(para)) !== null) parts.push(m[1]);
                const full = parts.join('');
                if (!full.includes(token)) return para;
                modified = true;
                count++;
                const replaced = full.split(token).join(value);
                let first = true;
                return para.replace(/<a:r\b[^>]*>[\s\S]*?<\/a:r>/g, (run) => {
                    if (first) {
                        first = false;
                        return run.replace(/<a:t[^>]*>[\s\S]*?<\/a:t>/, `<a:t>${replaced}</a:t>`);
                    }
                    const t = run.replace(/<[^>]*>/g, '').trim();
                    if (token.includes(t) || t.includes('{') || t.includes('}')) return '';
                    return run;
                });
            });
        }
        if (modified) zip.file(slidePath, xml);
    }
    const out = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(pptxPath, out);
    console.log(`   [Tokens] Done — ${count} replacement(s)`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN: assemblePresentation()
// ══════════════════════════════════════════════════════════════════════════════
export async function assemblePresentation({ presentationType, formData = {}, plots = [], userId }) {
    console.log('\n══════════════════════════════════════════');
    console.log('  ASSEMBLY v9 — Dynamic JSZip Merge');
    console.log('══════════════════════════════════════════');

    // ── 1. Resolve library path ─────────────────────────────────────────
    const typeName = presentationType?.name || 'Feasibility Study';
    const LIB = getLibraryPath(typeName);
    console.log(`   Library : ${LIB}`);

    // ── 2. Use DB sections if available, else SECTION_CONFIG ─────────────
    let sections;
    if (presentationType?.sections?.length > 0) {
        sections = presentationType.sections
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(s => ({
                order: s.order,
                folder: s.folderPath || s.name,
                file: s.filename || null,
                varying: s.isVarying || false,
                fallbackFolder: null,
            }));
        console.log(`   Sections: ${sections.length} (from DB)`);
    } else {
        sections = SECTION_CONFIG;
        console.log(`   Sections: ${sections.length} (from hardcoded config)`);
    }

    // ── 3. Normalize & deduplicate plots ─────────────────────────────────
    const rawPlots = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData]; // fallback: treat formData as a single "plot"

    console.log(`\n   Raw plots: ${rawPlots.length}`);
    const uniquePlots = deduplicatePlots(rawPlots);
    console.log(`   Unique plots: ${uniquePlots.length}\n`);

    if (uniquePlots.length === 0) {
        throw new Error('No valid plots could be created from the input. Check that city, assetType, category, and specs are filled in.');
    }

    // ── 4. Build ordered file list ──────────────────────────────────────
    const mergeList = []; // array of absolute file paths in order

    for (const section of sections) {
        if (section.varying) {
            const varyingFiles = resolveVaryingFiles(LIB, section, uniquePlots);
            for (const vf of varyingFiles) {
                mergeList.push(vf.absPath);
            }
        } else {
            const absPath = resolveFixedFile(LIB, section);
            if (absPath) {
                mergeList.push(absPath);
                console.log(`   ✅ [${section.folder}] → ${path.basename(absPath)} (${countSlides(absPath)} slides)`);
            }
        }
    }

    // ── Print merge plan ────────────────────────────────────────────────
    console.log(`\n   ╔══════════════════════════════════════════════╗`);
    console.log(`   ║  MERGE PLAN: ${mergeList.length} files`);
    console.log(`   ╠══════════════════════════════════════════════╣`);
    mergeList.forEach((f, i) => {
        const sc = countSlides(f);
        console.log(`   ║  ${String(i + 1).padStart(2)}. ${path.basename(f)} (${sc} slides)`);
    });
    console.log(`   ╚══════════════════════════════════════════════╝\n`);

    if (mergeList.length === 0) {
        throw new Error('No files found to merge! Check Library folder and plot key values.');
    }

    // ── 5. Merge with slide cap ─────────────────────────────────────────
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const safeName = (formData.title || formData.projectName || 'Report')
        .replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const outputFile = `${safeName}_${uuidv4().substring(0, 8)}.pptx`;
    const outputPath = path.join(outputDir, outputFile);

    const mergedBuffer = await mergePptxFiles(mergeList, MAX_SLIDES);
    fs.writeFileSync(outputPath, mergedBuffer);

    // ── 6. Replace {{PLACEHOLDERS}} ─────────────────────────────────────
    const projectName = formData.title || formData.projectName || 'Untitled Project';
    const clientName = formData.clientName || formData.client_name || 'Confidential';
    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    // Also build plot-specific tokens for the first plot
    const firstPlot = uniquePlots[0] || {};
    const plotCity = normToken(firstPlot.City || firstPlot.city || '');
    const plotAsset = normToken(firstPlot['Asset Type'] || firstPlot.assetType || '');
    const plotCat = normToken(firstPlot.Category || firstPlot.category || '');
    const plotSpec = normToken(firstPlot.Specifications || firstPlot.specifications || firstPlot.specs || '');

    await replaceTokens(outputPath, {
        '{{PROJECT_NAME}}': projectName,
        '{{CLIENT_NAME}}': clientName,
        '{{DATE}}': dateStr,
        '{{TITLE}}': projectName,
        '{{SUBTITLE}}': formData.subtitle || clientName,
        '{{Title}}': projectName,
        '{{Subtitle}}': formData.subtitle || clientName,
        '{{title}}': projectName,
        '{{subtitle}}': formData.subtitle || clientName,
        '{{project_name}}': projectName,
        '{{client_name}}': clientName,
        '{{YEAR}}': new Date().getFullYear().toString(),
        '{{CITY}}': plotCity,
        '{{ASSET_TYPE}}': plotAsset,
        '{{CATEGORY}}': plotCat,
        '{{SPECS}}': plotSpec,
    });

    // ── 7. Final stats ──────────────────────────────────────────────────
    const fileSize = fs.statSync(outputPath).size;
    const finalSlideCount = countSlides(outputPath);

    console.log('\n══════════════════════════════════════════');
    console.log('  ✅ ASSEMBLY COMPLETE');
    console.log(`  File   : ${outputFile}`);
    console.log(`  Slides : ${finalSlideCount}`);
    console.log(`  Size   : ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('══════════════════════════════════════════\n');

    return {
        fileName: outputFile,
        filePath: outputPath,
        fileSize,
        slideCount: finalSlideCount,
    };
}

// ─── Exports ─────────────────────────────────────────────────────────────────
export const generatePresentation = assemblePresentation;
export const generatePresentationFromTemplate = assemblePresentation;
export default { assemblePresentation, generatePresentation, generatePresentationFromTemplate };
