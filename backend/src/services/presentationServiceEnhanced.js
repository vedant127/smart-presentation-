import path from 'path';
import fs from 'fs';
import { Automizer } from 'pptx-automizer';
import { v4 as uuidv4 } from 'uuid';
import PizZip from 'pizzip';
import { findBestMatchFile, normalisePlotContext, buildSearchTokens } from '../utils/fileMatcher.js';

// ──────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/** Count slides inside a PPTX (it's just a ZIP) */
const countSlidesInFile = (filePath) => {
    try {
        const zip = new PizZip(fs.readFileSync(filePath));
        return Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
    } catch { return 1; }
};

/** Safe string coercion for placeholder replacement */
const safeText = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

/**
 * DEDUPLICATION — Problem #1
 *
 * Given an array of normalised plot contexts, return only the UNIQUE ones.
 * Two plots are considered the same if they have the same
 *   city + assetType + category + specifications  (all lowercased).
 *
 * Returns: Map<comboKey → ctx>  (insertion-ordered, no duplicates)
 */
const getUniquePlotCombos = (plotContexts) => {
    const seen = new Map();
    for (const ctx of plotContexts) {
        // KEY NORMALISATION — Problem #2:
        // Always lowercase + trim each field before building the key so
        // "Riyadh" and "riyadh" (and "RIYADH") all map to the same slot.
        const key = [
            (ctx.city || '').toLowerCase().trim(),
            (ctx.assetType || '').toLowerCase().trim(),
            (ctx.category || '').toLowerCase().trim(),
            (ctx.specifications || '').toLowerCase().trim(),
        ].join(' + ');

        if (!seen.has(key)) {
            seen.set(key, ctx);
            console.log(`   [Dedup] Unique combo registered: "${key}"`);
        } else {
            console.log(`   [Dedup] Skipping duplicate combo: "${key}"`);
        }
    }
    return seen; // Map<string, ctx>
};

// ──────────────────────────────────────────────────────────────────────────────
//  SLIDE ORDER SPEC (10 sections)
//
//  The correct order for Feasibility Study is:
//
//  FIXED START
//    01  cover_page              → main.pptx
//    02  table_of_contents       → main.pptx
//    03  project_background      → main.pptx
//    04  executive_summary       → main.pptx
//    05  site_assessment         → main.pptx
//
//  VARYING — one entry per unique plot combo
//    06  market_overview         → combo.pptx
//
//  FIXED MIDDLE
//    07  dev_recommendations_part1 → main.pptx
//
//  VARYING — one entry per unique plot combo
//    08  dev_recommendations_part2 → combo.pptx
//
//  FIXED END
//    09  financial_analysis      → main.pptx
//    10  disclaimer              → main.pptx
// ──────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
//  addAllSlides — add EVERY slide from a PPTX to the automizer
//  Each section's main.pptx contains exactly the slides it should contribute.
//  e.g. dev_recommendations_part1/main.pptx has 2 slides: header + sizing rationale
// ──────────────────────────────────────────────────────────────────────────────
const addAllSlides = (automizer, filePath, slideData, label) => {
    const total = countSlidesInFile(filePath);
    const key = `k_${label}_${uuidv4().substring(0, 6)}`;
    automizer.load(filePath, key);
    for (let i = 1; i <= total; i++) {
        automizer.addSlide(key, i, (slide) => {
            slide.modify(createEnhancedReplacer(slideData));
        });
    }
    console.log(`   ▶️  [${label}] ${total} slide(s) from "${path.basename(filePath)}"`);
    return total;
};

// ──────────────────────────────────────────────────────────────────────────────
//  pickFile — pick the right PPTX from a section folder
//    For FIXED sections: uses first file (or explicit filename).
//    For VARYING sections: uses FileMatcher to find best combo match.
// ──────────────────────────────────────────────────────────────────────────────
const pickFile = (sectionDir, ctx = null, fixedFilename = null) => {
    if (!fs.existsSync(sectionDir)) return null;

    // Fixed section — use named file or first pptx
    if (!ctx) {
        if (fixedFilename) {
            const p = path.join(sectionDir, fixedFilename);
            if (fs.existsSync(p)) return p;
        }
        const files = fs.readdirSync(sectionDir)
            .filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'));
        return files.length > 0 ? path.join(sectionDir, files[0]) : null;
    }

    // Varying section — match by normalised combo tokens
    const tokens = buildSearchTokens(ctx);
    if (tokens.length === 0) return null;
    return findBestMatchFile(sectionDir, tokens);
};

// ──────────────────────────────────────────────────────────────────────────────
//  MAIN ASSEMBLY FUNCTION
// ──────────────────────────────────────────────────────────────────────────────
export const assemblePresentation = async ({ presentationType, formData, plots, userId }) => {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  ASSEMBLY START: "${presentationType.name}"`.padEnd(43) + '║');
    console.log(`╚══════════════════════════════════════════╝`);
    console.log(`   Plots received: ${plots ? plots.length : 0}`);

    // ── 1. Init Automizer ─────────────────────────────────────────────────
    const baseDir = process.cwd();

    const automizer = new Automizer({
        templateDir: baseDir,
        outputDir: path.join(baseDir, 'generated'),
        removeExistingSlides: true,
        cleanup: false,
    });

    // ── 2. Load Root Template ─────────────────────────────────────────────
    let tplDir = path.resolve(baseDir, 'templates');
    if (!fs.existsSync(tplDir)) tplDir = path.resolve(baseDir, '..', 'templates');

    const rootCandidates = [
        path.join(tplDir, 'RootTemplate.pptx'),
        path.join(baseDir, 'Library', 'RootTemplate.pptx'),
        path.join(baseDir, '..', 'Library', 'RootTemplate.pptx'),
    ];
    const rootTemplatePath = rootCandidates.find(p => fs.existsSync(p));
    if (!rootTemplatePath) {
        throw new Error(`SYSTEM ERROR: RootTemplate.pptx not found. Checked: ${rootCandidates.join(', ')}`);
    }
    automizer.loadRoot(rootTemplatePath);
    console.log(`   ✅ Root Template: ${rootTemplatePath}`);

    // ── 3. Library root ───────────────────────────────────────────────────
    // Use lowercase folder name 'feasibility_study' (not presentationType.name)
    let libRoot = path.join(baseDir, 'Library');
    if (!fs.existsSync(libRoot)) libRoot = path.join(baseDir, '..', 'Library');
    const typeDir = path.join(libRoot, 'feasibility_study');

    // ── 4. Normalise all plot contexts (Problem #2: key normalisation) ────
    const rawContexts = (plots && plots.length > 0)
        ? plots.map(p => p.criteria || p.data || p)
        : [formData];

    const allContexts = rawContexts
        .map(normalisePlotContext)
        .filter(ctx => ctx.city || ctx.assetType || ctx.category || ctx.specifications);

    // Fallback: use formData itself
    if (allContexts.length === 0) {
        const fd = normalisePlotContext(formData);
        if (fd.city || fd.assetType) allContexts.push(fd);
    }

    // Problem #1: Deduplication — unique combos only
    const uniqueCombos = getUniquePlotCombos(allContexts);
    const uniqueCtxList = [...uniqueCombos.values()];

    console.log(`\n   📊 Unique plot combos after dedup: ${uniqueCtxList.length}`);
    uniqueCtxList.forEach((c, i) =>
        console.log(`      [${i + 1}] ${c.city} | ${c.assetType} | ${c.category} | ${c.specifications}`)
    );

    // ── 5. Build globalData for placeholder replacement ───────────────────
    const firstCtx = uniqueCtxList[0] || {};
    const globalData = {
        PROJECT_NAME: formData.projectName || formData.title || 'Real Estate Development Project',
        CLIENT_NAME: formData.clientName || 'Confidential Client',
        DATE: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        YEAR: new Date().getFullYear().toString(),
        CITY: firstCtx.city || '',
        ASSET_TYPE: firstCtx.assetType || '',
        CATEGORY: firstCtx.category || '',
        SPECIFICATIONS: firstCtx.specifications || '',
        ...formData,
    };

    // ── 6. CORRECT SLIDE ORDER (10 sections) ─────────────────────────────
    //  Walk through the 10-section playlist in exact order.
    //  Fixed start → Market Overviews → Fixed middle → Dev Recs Pt 2 → Fixed end
    //

    let slideCount = 0;

    /** Helper: add a fixed section by folder + optional filename */
    const addFixed = async (folderName, fixedFilename = null, label = folderName) => {
        const sectionDir = path.join(typeDir, folderName);
        const file = pickFile(sectionDir, null, fixedFilename);
        if (!file) {
            console.warn(`   ⚠️  [${label}] File not found — skipped.`);
            return;
        }
        slideCount += addAllSlides(automizer, file, globalData, label);
    };

    /** Helper: add a varying section for ONE combo context */
    const addVarying = (folderName, ctx, label = folderName) => {
        const sectionDir = path.join(typeDir, folderName);
        const file = pickFile(sectionDir, ctx);
        if (!file) {
            console.warn(`   ⚠️  [${label}] No match for [${buildSearchTokens(ctx).join(', ')}] — skipped.`);
            return;
        }
        const slideData = {
            ...globalData,
            CITY: ctx.city || globalData.CITY,
            ASSET_TYPE: ctx.assetType || globalData.ASSET_TYPE,
            CATEGORY: ctx.category || globalData.CATEGORY,
            SPECIFICATIONS: ctx.specifications || globalData.SPECIFICATIONS,
        };
        slideCount += addAllSlides(automizer, file, slideData, label);
    };

    // ── FIXED START ───────────────────────────────────────────────────────
    console.log('\n─── FIXED START ─────────────────────────────────────');
    await addFixed('01_cover_page', 'main.pptx', 'Cover');
    await addFixed('02_table_of_contents', 'main.pptx', 'TOC');
    await addFixed('03_project_background', 'main.pptx', 'ProjectBG');
    await addFixed('04_executive_summary', 'main.pptx', 'ExecSummary');
    await addFixed('05_site_assessment', 'main.pptx', 'SiteAssessment');

    // ── VARYING: Market Overview (one block per unique combo) ─────────────
    console.log('\n─── MARKET OVERVIEW (per unique plot combo) ─────────');
    for (const ctx of uniqueCtxList) {
        addVarying('06_market_overview', ctx, `MarketOverview:${ctx.city}+${ctx.assetType}`);
    }

    // ── FIXED MIDDLE ──────────────────────────────────────────────────────
    console.log('\n─── FIXED MIDDLE ────────────────────────────────────');
    await addFixed('07_dev_recommendations_part1', 'main.pptx', 'DevRec1');

    // ── VARYING: Dev Recs Pt 2 (one block per unique combo) ──────────────
    console.log('\n─── DEV RECS PART 2 (per unique plot combo) ─────────');
    for (const ctx of uniqueCtxList) {
        addVarying('08_dev_recommendations_part2', ctx,
            `DevRec2:${ctx.city}+${ctx.assetType}`);
    }

    // ── FIXED END ─────────────────────────────────────────────────────────
    console.log('\n─── FIXED END ───────────────────────────────────────');
    await addFixed('09_financial_analysis', 'main.pptx', 'FinancialAnalysis');
    await addFixed('10_disclaimer', 'main.pptx', 'Disclaimer');

    // ── 7. Write file ─────────────────────────────────────────────────────
    const shortId = uuidv4().substring(0, 8);
    const safeTitle = (formData.title || formData.projectName || 'Presentation')
        .replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const outputFile = `${safeTitle}_${shortId}.pptx`;
    const outputDir = path.join(baseDir, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    await automizer.write(outputFile);
    const outputPath = path.join(outputDir, outputFile);

    // ── 8. Nuclear post-processor (placeholder replace + image inject) ────
    try {
        const { nuclearCleanup } = await import('./presentationServiceNew.js');
        if (typeof nuclearCleanup === 'function') {
            nuclearCleanup(outputPath, globalData, tplDir);
        }
    } catch (e) {
        console.warn('   [NuclearCleanup] Skipped:', e.message);
    }

    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  ✅ ASSEMBLY COMPLETE                    ║`);
    console.log(`║  File  : ${outputFile.substring(0, 32).padEnd(32)} ║`);
    console.log(`║  Slides: ${String(slideCount).padEnd(32)} ║`);
    console.log(`╚══════════════════════════════════════════╝\n`);

    return {
        fileName: outputFile,
        filePath: outputPath,
        fileSize: fs.statSync(outputPath).size,
        slideCount,
    };
};

// ──────────────────────────────────────────────────────────────────────────────
//  Enhanced Placeholder Replacer
//  Supports: {{PLACEHOLDER}}, {{ Placeholder }}, {{placeholder}}
// ──────────────────────────────────────────────────────────────────────────────
const createEnhancedReplacer = (dataContext) => {
    return (xml) => {
        if (typeof xml !== 'string') return xml;
        if (!dataContext) return xml;

        let out = xml;
        for (const [key, rawVal] of Object.entries(dataContext)) {
            const val = safeText(rawVal);
            const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`{{\\s*${safeKey}\\s*}}`, 'gi');
            out = out.replace(regex, val);
        }
        return out;
    };
};

// ── Backward compatibility aliases ────────────────────────────────────────────
export const generatePresentation = assemblePresentation;
export const generatePresentationFromTemplate = assemblePresentation;

export default { assemblePresentation, generatePresentation, generatePresentationFromTemplate };
