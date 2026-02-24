import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import PizZip from 'pizzip';
import JSZip from 'jszip';

// ══════════════════════════════════════════════════════════════════════════════
//  PRESENTATION SERVICE (New) — Used by projectController.js
//  Same logic as presentationServiceEnhanced.js
// ══════════════════════════════════════════════════════════════════════════════

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

function getLibraryPath() {
    const cwd = process.cwd();
    let lib = path.join(cwd, 'Library', 'feasibility_study');
    if (fs.existsSync(lib)) return lib;
    lib = path.join(cwd, '..', 'Library', 'feasibility_study');
    if (fs.existsSync(lib)) return lib;
    throw new Error('Library/feasibility_study/ folder not found!');
}

function getRootTemplate() {
    const cwd = process.cwd();
    const candidates = [
        path.join(cwd, 'templates', 'RootTemplate.pptx'),
        path.join(cwd, '..', 'templates', 'RootTemplate.pptx'),
        path.join(cwd, 'Library', 'RootTemplate.pptx'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    const cover = path.join(getLibraryPath(), 'cover_page', 'main.pptx');
    if (fs.existsSync(cover)) return cover;
    throw new Error('RootTemplate.pptx not found!');
}

async function replaceCoverPageTokens(pptxPath, replacements) {
    const buffer = fs.readFileSync(pptxPath);
    const zip = await JSZip.loadAsync(buffer);

    const slideFiles = Object.keys(zip.files).filter(
        f => /^ppt\/slides\/slide\d+\.xml$/.test(f)
    );

    let totalReplacements = 0;
    for (const slidePath of slideFiles) {
        let xml = await zip.file(slidePath).async('string');
        let modified = false;

        for (const [token, value] of Object.entries(replacements)) {
            if (xml.includes(token)) {
                xml = xml.split(token).join(value);
                modified = true;
                totalReplacements++;
            }
        }

        // Handle PowerPoint split-tag issue
        for (const [token, value] of Object.entries(replacements)) {
            const paragraphRegex = /<a:p\b[^>]*>[\s\S]*?<\/a:p>/g;
            xml = xml.replace(paragraphRegex, (paragraph) => {
                const textParts = [];
                const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
                let m;
                while ((m = textRegex.exec(paragraph)) !== null) textParts.push(m[1]);
                const fullText = textParts.join('');
                if (fullText.includes(token)) {
                    const replacedText = fullText.split(token).join(value);
                    let firstRun = true;
                    return paragraph.replace(/<a:r\b[^>]*>[\s\S]*?<\/a:r>/g, (run) => {
                        if (firstRun) {
                            firstRun = false;
                            return run.replace(/<a:t[^>]*>[\s\S]*?<\/a:t>/, `<a:t>${replacedText}</a:t>`);
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

    if (totalReplacements > 0) {
        fs.writeFileSync(pptxPath, await zip.generateAsync({ type: 'nodebuffer' }));
    }
}

export async function assemblePresentation({ presentationType, formData = {}, plots = [], userId }) {
    console.log('\n══════════════════════════════════════════');
    console.log('  ASSEMBLY START (New Service)');
    console.log('══════════════════════════════════════════');

    const LIBRARY = getLibraryPath();

    const rawPlots = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];
    const uniquePlots = getUniquePlots(rawPlots);
    console.log(`   Plots: ${rawPlots.length} total → ${uniquePlots.length} unique`);

    const files = [];
    files.push({ path: path.join(LIBRARY, 'cover_page', 'main.pptx'), label: 'Cover Page' });
    files.push({ path: path.join(LIBRARY, 'table_of_contents', 'main.pptx'), label: 'Table of Contents' });
    files.push({ path: path.join(LIBRARY, 'project_background', 'main.pptx'), label: 'Project Background' });
    files.push({ path: path.join(LIBRARY, 'executive_summary', 'main.pptx'), label: 'Executive Summary' });
    files.push({ path: path.join(LIBRARY, 'site_assessment', 'main.pptx'), label: 'Site Assessment' });

    for (const plot of uniquePlots) {
        const key = makePlotKey(plot);
        files.push({ path: path.join(LIBRARY, 'market_overview', `${key}.pptx`), label: `Market Overview [${key}]` });
    }

    files.push({ path: path.join(LIBRARY, 'dev_recommendations_part1', 'main.pptx'), label: 'Dev Recs Part 1' });

    for (const plot of uniquePlots) {
        const key = makePlotKey(plot);
        files.push({ path: path.join(LIBRARY, 'dev_recommendations_part2', `${key}.pptx`), label: `Dev Recs Part 2 [${key}]` });
    }

    files.push({ path: path.join(LIBRARY, 'financial_investment_analysis', 'main.pptx'), label: 'Financial Analysis' });
    files.push({ path: path.join(LIBRARY, 'disclaimer', 'main.pptx'), label: 'Disclaimer' });

    const validFiles = files.filter(f => {
        if (fs.existsSync(f.path)) {
            console.log(`     ✅ ${f.label}`);
            return true;
        }
        console.warn(`     ⚠️  SKIP: ${f.label}`);
        return false;
    });

    if (validFiles.length === 0) throw new Error('No Library files found!');

    const baseDir = process.cwd();
    const outputDir = path.join(baseDir, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const automizer = new Automizer({
        templateDir: baseDir,
        outputDir,
        removeExistingSlides: true,
        cleanup: false,
    });
    automizer.loadRoot(getRootTemplate());

    let totalSlides = 0;
    for (const f of validFiles) {
        const slides = countSlides(f.path);
        const loadKey = `f_${totalSlides}_${uuidv4().substring(0, 5)}`;
        automizer.load(f.path, loadKey);
        for (let i = 1; i <= slides; i++) {
            automizer.addSlide(loadKey, i);
            totalSlides++;
        }
    }

    const safeName = (formData.title || 'Report').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const outputFile = `${safeName}_${uuidv4().substring(0, 8)}.pptx`;
    await automizer.write(outputFile);
    const outputPath = path.join(outputDir, outputFile);

    // Replace cover page tokens
    const projectName = formData.title || formData.projectName || 'Untitled Project';
    const clientName = formData.clientName || formData.client_name || 'Confidential Client';
    await replaceCoverPageTokens(outputPath, {
        '{{PROJECT_NAME}}': projectName,
        '{{CLIENT_NAME}}': clientName,
        '{{DATE}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        '{{YEAR}}': new Date().getFullYear().toString(),
    });

    console.log(`\n  ✅ DONE: ${outputFile} (${totalSlides} slides)\n`);

    return {
        fileName: outputFile,
        filePath: outputPath,
        fileSize: fs.statSync(outputPath).size,
        slideCount: totalSlides,
    };
}

export default { assemblePresentation };