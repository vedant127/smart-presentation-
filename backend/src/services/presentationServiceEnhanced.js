import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import PizZip from 'pizzip';
import JSZip from 'jszip';

// ══════════════════════════════════════════════════════════════════════════════
//  PRESENTATION ASSEMBLY SERVICE (v3)
//
//  Pure file-merge from Library folder.
//  NO AI content. NO placeholders. NO programmatic slides.
//  Every slide in the output comes from a real PPTX file in the Library.
//
//  Library Structure:
//    Library/Feasibility Study/
//      01_Cover Page/cover.pptx
//      02_Table of Contents/toc.pptx
//      03_Project Background/project_background.pptx
//      04_Executive Summary/executive_summary.pptx
//      05_Site Assessment/site_assessment.pptx
//      06_Market Overview/{city + assetType + category + specs}.pptx
//      07_Development Recommendations Part 1/devrec_part1.pptx
//      08_Development Recommendations Part 2/{city + assetType + category + specs}.pptx
//      09_Development Recommendations Part 3/devrec_part3.pptx
//      10_Financial & Investment Analysis/financial_investment_analysis.pptx
//      11_Disclaimer/disclaimer.pptx
//
//  After merging, cover page tokens {{PROJECT_NAME}}, {{CLIENT_NAME}},
//  {{DATE}} are replaced with actual user values.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Plot Key ────────────────────────────────────────────────────────────────
// Filename format: "city + assetType + category + specs" all lowercase
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

// ─── Count slides in a PPTX ─────────────────────────────────────────────────
function countSlides(filePath) {
    try {
        const zip = new PizZip(fs.readFileSync(filePath));
        return Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
    } catch { return 0; }
}

// ─── Locate Library folder ──────────────────────────────────────────────────
function getLibraryPath() {
    const cwd = process.cwd();
    // Try new structure first: "Feasibility Study" (with spaces)
    let lib = path.join(cwd, 'Library', 'Feasibility Study');
    if (fs.existsSync(lib)) return lib;
    lib = path.join(cwd, '..', 'Library', 'Feasibility Study');
    if (fs.existsSync(lib)) return lib;
    // Fallback to old structure
    lib = path.join(cwd, 'Library', 'feasibility_study');
    if (fs.existsSync(lib)) return lib;
    lib = path.join(cwd, '..', 'Library', 'feasibility_study');
    if (fs.existsSync(lib)) return lib;
    throw new Error('Library/Feasibility Study/ folder not found!');
}

// ─── Locate Root Template ───────────────────────────────────────────────────
function getRootTemplate() {
    const cwd = process.cwd();
    const candidates = [
        path.join(cwd, 'templates', 'RootTemplate.pptx'),
        path.join(cwd, '..', 'templates', 'RootTemplate.pptx'),
        path.join(cwd, 'Library', 'RootTemplate.pptx'),
        path.join(cwd, '..', 'Library', 'RootTemplate.pptx'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    // Fallback: use the cover page as template
    const lib = getLibraryPath();
    const cover = path.join(lib, '01_Cover Page', 'cover.pptx');
    if (fs.existsSync(cover)) return cover;
    throw new Error('RootTemplate.pptx not found!');
}

// ══════════════════════════════════════════════════════════════════════════════
//  COVER PAGE TOKEN REPLACEMENT
//
//  After merging, opens the output PPTX and replaces template tags
//  like {{PROJECT_NAME}}, {{CLIENT_NAME}}, {{DATE}} on ALL slides
//  with actual user values.
//
//  This works by modifying the raw XML inside the PPTX (ZIP) file.
//  PowerPoint sometimes splits text across XML runs, so we also handle
//  the split-tag case (e.g. <a:r>{{PROJECT</a:r><a:r>_NAME}}</a:r>).
// ══════════════════════════════════════════════════════════════════════════════
async function replaceCoverPageTokens(pptxPath, replacements) {
    console.log('   [TokenReplace] Replacing template tokens...');
    const buffer = fs.readFileSync(pptxPath);
    const zip = await JSZip.loadAsync(buffer);

    // Get all slide XML files
    const slideFiles = Object.keys(zip.files).filter(
        f => /^ppt\/slides\/slide\d+\.xml$/.test(f)
    );

    let totalReplacements = 0;

    for (const slidePath of slideFiles) {
        let xml = await zip.file(slidePath).async('string');
        let modified = false;

        for (const [token, value] of Object.entries(replacements)) {
            // Direct replacement (token is in one XML run)
            if (xml.includes(token)) {
                xml = xml.split(token).join(value);
                modified = true;
                totalReplacements++;
            }
        }

        // Handle PowerPoint split-tag issue:
        // PowerPoint may split "{{PROJECT_NAME}}" across multiple <a:r> XML runs.
        // Strategy: For each <a:p> paragraph, extract all <a:t> text, concatenate,
        // check for tokens, and if found, consolidate into a single <a:t> with replacement.
        for (const [token, value] of Object.entries(replacements)) {
            const paragraphRegex = /<a:p\b[^>]*>[\s\S]*?<\/a:p>/g;
            xml = xml.replace(paragraphRegex, (paragraph) => {
                const textParts = [];
                const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
                let match;
                while ((match = textRegex.exec(paragraph)) !== null) {
                    textParts.push(match[1]);
                }
                const fullText = textParts.join('');

                if (fullText.includes(token)) {
                    modified = true;
                    totalReplacements++;
                    const replacedText = fullText.split(token).join(value);
                    let firstRun = true;
                    return paragraph.replace(/<a:r\b[^>]*>[\s\S]*?<\/a:r>/g, (run) => {
                        if (firstRun) {
                            firstRun = false;
                            return run.replace(/<a:t[^>]*>[\s\S]*?<\/a:t>/, `<a:t>${replacedText}</a:t>`);
                        }
                        const runText = run.replace(/<[^>]*>/g, '').trim();
                        if (token.includes(runText) || runText.includes('{') || runText.includes('}')) {
                            return '';
                        }
                        return run;
                    });
                }
                return paragraph;
            });
        }

        if (modified) {
            zip.file(slidePath, xml);
            console.log(`     ✅ ${slidePath} — tokens replaced`);
        }
    }

    if (totalReplacements > 0) {
        const output = await zip.generateAsync({ type: 'nodebuffer' });
        fs.writeFileSync(pptxPath, output);
        console.log(`   [TokenReplace] Done — ${totalReplacements} replacement(s) across ${slideFiles.length} slides`);
    } else {
        console.log('   [TokenReplace] No tokens found to replace');
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN ASSEMBLY FUNCTION
// ══════════════════════════════════════════════════════════════════════════════
export async function assemblePresentation({ presentationType, formData = {}, plots = [], userId }) {
    console.log('\n══════════════════════════════════════════');
    console.log('  ASSEMBLY START (v3 — New Library Structure)');
    console.log('══════════════════════════════════════════');

    const LIBRARY = getLibraryPath();
    console.log(`   Library: ${LIBRARY}`);

    // ── 1. Normalize plot data ──────────────────────────────────────────
    const rawPlots = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];

    // ── 2. Deduplicate ──────────────────────────────────────────────────
    const uniquePlots = getUniquePlots(rawPlots);
    console.log(`   Plots: ${rawPlots.length} total → ${uniquePlots.length} unique\n`);

    // ── 3. Build ordered file list from Library ─────────────────────────
    //    Uses the NEW numbered folder structure with exact filenames
    const files = [];

    function addFixed(folder, filename, label) {
        const p = path.join(LIBRARY, folder, filename);
        if (fs.existsSync(p)) {
            files.push({ path: p, label });
            console.log(`     ✅ FOUND: ${label} → ${path.relative(LIBRARY, p)}`);
        } else {
            console.warn(`     ❌ MISSING: ${label} → ${p}`);
        }
    }

    function addVarying(folder, plot, label) {
        const key = makePlotKey(plot);
        const p = path.join(LIBRARY, folder, `${key}.pptx`);
        if (fs.existsSync(p)) {
            files.push({ path: p, label: `${label} [${key}]` });
            console.log(`     ✅ FOUND: ${label} [${key}] → ${path.relative(LIBRARY, p)}`);
        } else {
            console.warn(`     ❌ MISSING: ${label} [${key}] → ${p} ← check filename matches exactly`);
        }
    }

    // FIXED SECTIONS — exact folder name + exact filename
    addFixed('01_Cover Page', 'cover.pptx', 'Cover Page');
    addFixed('02_Table of Contents', 'toc.pptx', 'Table of Contents');
    addFixed('03_Project Background', 'project_background.pptx', 'Project Background');
    addFixed('04_Executive Summary', 'executive_summary.pptx', 'Executive Summary');
    addFixed('05_Site Assessment', 'site_assessment.pptx', 'Site Assessment');

    // VARYING — Market Overview (one per unique plot)
    for (const plot of uniquePlots) {
        addVarying('06_Market Overview', plot, 'Market Overview');
    }

    // FIXED MIDDLE
    addFixed('07_Development Recommendations Part 1', 'devrec_part1.pptx', 'Dev Recommendations Part 1');

    // VARYING — Dev Recommendations Part 2 (one per unique plot)
    for (const plot of uniquePlots) {
        addVarying('08_Development Recommendations Part 2', plot, 'Dev Recommendations Part 2');
    }

    // FIXED END
    addFixed('09_Development Recommendations Part 3', 'devrec_part3.pptx', 'Dev Recommendations Part 3');
    addFixed('10_Financial & Investment Analysis', 'financial_investment_analysis.pptx', 'Financial & Investment Analysis');
    addFixed('11_Disclaimer', 'disclaimer.pptx', 'Disclaimer');

    // ── 4. Filter to valid files only ───────────────────────────────────
    console.log(`\n   Total files to merge: ${files.length}`);
    if (files.length === 0) {
        throw new Error('No Library files found! Check Library/Feasibility Study/ folder.');
    }

    // ── 5. Merge all PPTX files using pptx-automizer ────────────────────
    const baseDir = process.cwd();
    const outputDir = path.join(baseDir, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const rootTemplate = getRootTemplate();
    console.log(`   Root Template: ${rootTemplate}`);

    const automizer = new Automizer({
        templateDir: baseDir,
        outputDir,
        removeExistingSlides: true,
        cleanup: false,
    });
    automizer.loadRoot(rootTemplate);

    let totalSlides = 0;
    for (const f of files) {
        const slides = countSlides(f.path);
        const loadKey = `file_${totalSlides}_${uuidv4().substring(0, 5)}`;
        automizer.load(f.path, loadKey);
        for (let i = 1; i <= slides; i++) {
            automizer.addSlide(loadKey, i);
            totalSlides++;
        }
        console.log(`     📄 ${f.label} → ${slides} slide(s)`);
    }

    // ── 6. Write output file ────────────────────────────────────────────
    const safeName = (formData.title || formData.projectName || 'Report')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 40);
    const outputFile = `${safeName}_${uuidv4().substring(0, 8)}.pptx`;

    await automizer.write(outputFile);
    const outputPath = path.join(outputDir, outputFile);

    // ── 7. Replace cover page tokens with real user data ────────────────
    const projectName = formData.title || formData.projectName || 'Untitled Project';
    const clientName = formData.clientName || formData.client_name || 'Confidential Client';
    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    await replaceCoverPageTokens(outputPath, {
        '{{PROJECT_NAME}}': projectName,
        '{{CLIENT_NAME}}': clientName,
        '{{DATE}}': dateStr,
        '{{YEAR}}': new Date().getFullYear().toString(),
        '{{CITY}}': (uniquePlots[0] && (uniquePlots[0].city || uniquePlots[0].City)) || '',
        '{{ASSET_TYPE}}': (uniquePlots[0] && (uniquePlots[0].assetType || uniquePlots[0]['Asset Type'])) || '',
    });

    // ── 8. Done ─────────────────────────────────────────────────────────
    const fileSize = fs.statSync(outputPath).size;

    console.log('\n══════════════════════════════════════════');
    console.log(`  ✅ ASSEMBLY COMPLETE`);
    console.log(`  File  : ${outputFile}`);
    console.log(`  Slides: ${totalSlides}`);
    console.log(`  Size  : ${(fileSize / 1024).toFixed(1)} KB`);
    console.log('══════════════════════════════════════════\n');

    return {
        fileName: outputFile,
        filePath: outputPath,
        fileSize,
        slideCount: totalSlides,
    };
}

// ── Backward compatibility aliases ──────────────────────────────────────────
export const generatePresentation = assemblePresentation;
export const generatePresentationFromTemplate = assemblePresentation;

export default { assemblePresentation, generatePresentation, generatePresentationFromTemplate };
