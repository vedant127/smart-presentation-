import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import PizZip from 'pizzip';
import JSZip from 'jszip';

// ══════════════════════════════════════════════════════════════════════════════
//  PRESENTATION ASSEMBLY SERVICE
//
//  Pure file-merge from Library folder.
//  NO AI content. NO placeholders. NO programmatic slides.
//  Every slide in the output comes from a real PPTX file in the Library.
//
//  After merging, cover page tokens {{PROJECT_NAME}}, {{CLIENT_NAME}},
//  {{DATE}} are replaced with actual user values.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Plot Key ────────────────────────────────────────────────────────────────
function makePlotKey(plot) {
    return [
        plot.city || plot.City || '',
        plot.assetType || plot['Asset Type'] || plot.asset_type || '',
        plot.category || plot.Category || '',
        plot.specs || plot.specifications || plot.Specifications || plot.spec || '',
    ]
        .join('_')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
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
    let lib = path.join(cwd, 'Library', 'feasibility_study');
    if (fs.existsSync(lib)) return lib;
    lib = path.join(cwd, '..', 'Library', 'feasibility_study');
    if (fs.existsSync(lib)) return lib;
    throw new Error('Library/feasibility_study/ folder not found!');
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
    const lib = getLibraryPath();
    const cover = path.join(lib, 'cover_page', 'main.pptx');
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
            // Match each paragraph that might contain split tokens
            const paragraphRegex = /<a:p\b[^>]*>[\s\S]*?<\/a:p>/g;
            xml = xml.replace(paragraphRegex, (paragraph) => {
                // Extract all text from <a:t> tags in this paragraph
                const textParts = [];
                const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
                let match;
                while ((match = textRegex.exec(paragraph)) !== null) {
                    textParts.push(match[1]);
                }
                const fullText = textParts.join('');

                // If the concatenated text contains our token, replace it
                if (fullText.includes(token)) {
                    const replacedText = fullText.split(token).join(value);
                    // Replace all <a:t>...</a:t> instances with a single one containing the replaced text
                    // Keep the first run's formatting, remove others
                    let firstRun = true;
                    return paragraph.replace(/<a:r\b[^>]*>[\s\S]*?<\/a:r>/g, (run) => {
                        if (firstRun) {
                            firstRun = false;
                            // Replace the text content in the first run
                            return run.replace(/<a:t[^>]*>[\s\S]*?<\/a:t>/, `<a:t>${replacedText}</a:t>`);
                        }
                        // Check if this run contains part of the token — if so, remove it
                        const runText = run.replace(/<[^>]*>/g, '').trim();
                        if (token.includes(runText) || runText.includes('{') || runText.includes('}')) {
                            return ''; // Remove this split run
                        }
                        return run; // Keep non-token runs
                    });
                }
                return paragraph; // No token found, keep as-is
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
    console.log('  ASSEMBLY START');
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
    const files = [];

    // FIXED START
    files.push({ path: path.join(LIBRARY, 'cover_page', 'main.pptx'), label: 'Cover Page' });
    files.push({ path: path.join(LIBRARY, 'table_of_contents', 'main.pptx'), label: 'Table of Contents' });
    files.push({ path: path.join(LIBRARY, 'project_background', 'main.pptx'), label: 'Project Background' });
    files.push({ path: path.join(LIBRARY, 'executive_summary', 'main.pptx'), label: 'Executive Summary' });
    files.push({ path: path.join(LIBRARY, 'site_assessment', 'main.pptx'), label: 'Site Assessment' });

    // VARYING — Market Overview
    for (const plot of uniquePlots) {
        const key = makePlotKey(plot);
        files.push({
            path: path.join(LIBRARY, 'market_overview', `${key}.pptx`),
            label: `Market Overview [${key}]`,
        });
    }

    // FIXED MIDDLE
    files.push({ path: path.join(LIBRARY, 'dev_recommendations_part1', 'main.pptx'), label: 'Dev Recommendations Part 1' });

    // VARYING — Dev Recommendations Part 2
    for (const plot of uniquePlots) {
        const key = makePlotKey(plot);
        files.push({
            path: path.join(LIBRARY, 'dev_recommendations_part2', `${key}.pptx`),
            label: `Dev Recommendations Part 2 [${key}]`,
        });
    }

    // FIXED END
    files.push({ path: path.join(LIBRARY, 'financial_investment_analysis', 'main.pptx'), label: 'Financial & Investment Analysis' });
    files.push({ path: path.join(LIBRARY, 'disclaimer', 'main.pptx'), label: 'Disclaimer' });

    // ── 4. Filter to existing files ─────────────────────────────────────
    console.log('   File list:');
    const validFiles = [];
    for (const f of files) {
        if (fs.existsSync(f.path)) {
            const slides = countSlides(f.path);
            console.log(`     ✅ ${f.label} (${slides} slide${slides !== 1 ? 's' : ''})`);
            validFiles.push(f);
        } else {
            console.warn(`     ⚠️  SKIP: ${f.label} — file not found: ${path.basename(f.path)}`);
        }
    }

    if (validFiles.length === 0) {
        throw new Error('No Library PPTX files found! Check Library/feasibility_study/ folder.');
    }

    // ── 5. Merge all PPTX files ─────────────────────────────────────────
    const baseDir = process.cwd();
    const outputDir = path.join(baseDir, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const rootTemplate = getRootTemplate();
    console.log(`\n   Root Template: ${rootTemplate}`);

    const automizer = new Automizer({
        templateDir: baseDir,
        outputDir,
        removeExistingSlides: true,
        cleanup: false,
    });
    automizer.loadRoot(rootTemplate);

    let totalSlides = 0;
    for (const f of validFiles) {
        const slides = countSlides(f.path);
        const loadKey = `file_${totalSlides}_${uuidv4().substring(0, 5)}`;
        automizer.load(f.path, loadKey);
        for (let i = 1; i <= slides; i++) {
            automizer.addSlide(loadKey, i);
            totalSlides++;
        }
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
