/**
 * pptx-automizer based assembly — bulletproof addSlide with layout import
 *
 * Use this when varying slides appear blank with JSZip merge.
 * pptx-automizer auto-imports slideLayouts/slideMasters so content renders correctly.
 *
 * Enable: Add USE_PPTX_AUTOMIZER=true to .env
 *
 * COMMON REASONS addSlide() SEEMS TO DO NOTHING:
 * 1. Wrong template name — must match exactly the label passed to load()
 * 2. Slides added to wrong position — we add in section order (root → fixed → varying)
 * 3. Missing autoImportSlideMasters — slides reference layouts that don't exist in output
 * 4. loadRoot path wrong — templateDir must be parent of all loaded files
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { Automizer } from 'pptx-automizer';
import PizZip from 'pizzip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Use keyBuilder for form + schema compatibility (includes price range) ─────
import { buildKey, buildKeyFromForm, formDataToCriteria, findMatchingFile } from '../utils/keyBuilder.js';

/** Deduplicate: one entry per unique key (no repeats for same plot criteria) */
function getUniqueKeys(plots) {
    const uniqueKeys = new Set();
    for (const plot of plots || []) {
        const criteria = plot.criteria || plot.data || plot;
        const key = (criteria.city || criteria.propertyType || criteria.priceRange)
            ? buildKeyFromForm(criteria)
            : buildKey(formDataToCriteria(criteria));
        if (key) uniqueKeys.add(key);
        const legacy = buildKey(formDataToCriteria(criteria));
        if (legacy && legacy !== key) uniqueKeys.add(legacy);
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

function getLibraryPath(typeName = 'Feasibility Study') {
    const backendRoot = path.join(__dirname, '..', '..');
    const candidates = [
        path.join(backendRoot, 'Library', typeName),
        path.join(process.cwd(), 'Library', typeName),
        path.join(process.cwd(), '..', 'Library', typeName),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    const libRoot = path.join(backendRoot, 'Library');
    if (fs.existsSync(libRoot)) return path.join(libRoot, typeName);
    throw new Error(`Library folder not found for type: ${typeName}`);
}

// ─── pptx-automizer assembly ──────────────────────────────────────────────────

/**
 * Add all slides from a template. pptx-automizer preserves theme/masters when
 * removeExistingSlides: false and autoImportSlideMasters: true.
 */
async function addAllSlidesFromTemplate(pres, templateId, fullPath, label) {
    const zip = new PizZip(fs.readFileSync(fullPath));
    const slidePaths = Object.keys(zip.files)
        .filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k))
        .sort((a, b) => parseInt(a.match(/slide(\d+)/)[1]) - parseInt(b.match(/slide(\d+)/)[1]));

    const slideCount = slidePaths.length;
    console.log(`  [AUTOMIZER] Adding ${slideCount} slides from "${templateId}" (${path.basename(fullPath)})`);

    if (slideCount === 0) {
        console.warn(`  [AUTOMIZER] WARNING: No slides in ${fullPath}`);
        return;
    }

    for (let i = 1; i <= slideCount; i++) {
        try {
            pres.addSlide(templateId, i);
        } catch (err) {
            console.error(`  [AUTOMIZER] ✗ addSlide(${templateId}, ${i}) FAILED:`, err.message);
            throw err;
        }
    }
    const totalNow = typeof pres.getSlideCount === 'function' ? pres.getSlideCount() : '?';
    console.log(`  [AUTOMIZER] ✓ Added ${slideCount} slides from ${templateId}. Total slides: ${totalNow}`);
}

/**
 * Assemble presentation using pptx-automizer.
 * Uses autoImportSlideMasters so varying slides render correctly.
 */
export async function assemblePresentationAutomizer({ presentationType, formData = {}, plots = [], userId }) {
    console.log('\n══════════════════════════════════════════');
    console.log('  ASSEMBLY (pptx-automizer)');
    console.log('══════════════════════════════════════════');

    const typeName = presentationType?.name || 'Feasibility Study';
    const templateDir = getLibraryPath(typeName);
    const backendRoot = path.join(__dirname, '..', '..');
    const outputDir = path.join(backendRoot, 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const uniqueKeys = getUniqueKeys(plots || []);
    console.log('Unique keys:', uniqueKeys);

    // Root: use cover.pptx — preserves theme, masters, fonts. DO NOT truncate.
    let rootPath = path.join(templateDir, '01_Cover Page', 'cover.pptx');
    if (!fs.existsSync(rootPath)) {
        const coverDir = path.join(templateDir, '01_Cover Page');
        const first = fs.existsSync(coverDir) ? fs.readdirSync(coverDir).find(f => f.endsWith('.pptx')) : null;
        rootPath = first ? path.join(coverDir, first) : null;
    }
    if (!rootPath || !fs.existsSync(rootPath)) {
        throw new Error('Root template (cover.pptx) not found in Library. Run: npm run populate');
    }

    console.log(`  [AUTOMIZER] Root: ${path.basename(rootPath)} (preserves theme/masters)`);

    const automizer = new Automizer({
        templateDir,
        outputDir,
        removeExistingSlides: false,   // CRITICAL: keep root slides & theme — content survives
        autoImportSlideMasters: true,  // Import layouts so varying slides render correctly
        cleanup: true,
        verbosity: 1,
        compression: 6,
    });

    const rootRel = path.relative(templateDir, rootPath).replace(/\\/g, '/');
    let pres = automizer.loadRoot(rootRel);
    // Root keeps its slides (cover). We append toc, project_background, etc. — no need to add cover again.

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

    for (const sec of sections) {
        const folder = sec.folderPath || sec.folder;
        const label = sec.name || folder;

        // Skip cover — already in root (loadRoot keeps it)
        if (folder === '01_Cover Page' || folder?.startsWith('01_Cover')) {
            console.log(`  [AUTOMIZER] Skip ${label} (already in root)`);
            continue;
        }

        if (sec.isVarying && !sec.filename) {
            const plotCriteria = (plots || [])[0]?.criteria || (plots || [])[0]?.data || {};
            const addedPaths = new Set();
            for (const key of uniqueKeys) {
                let fullPath = path.join(templateDir, folder, `${key}.pptx`);
                if (!fs.existsSync(fullPath)) {
                    fullPath = findMatchingFile(path.join(templateDir, folder), plotCriteria);
                }
                if (!fullPath || addedPaths.has(fullPath)) {
                    if (!fullPath) console.warn(`  ⚠️ [VARYING] ${label} → SKIP (not found): ${key}.pptx`);
                    continue;
                }
                addedPaths.add(fullPath);

                const templateId = `var_${path.basename(fullPath, '.pptx').replace(/[^a-z0-9]/gi, '_')}`;
                console.log(`  [AUTOMIZER] Loading varying: ${path.basename(fullPath)} as "${templateId}"`);

                const relPath = path.relative(templateDir, fullPath).replace(/\\/g, '/');
                try {
                    pres = pres.load(relPath, templateId);
                } catch (err) {
                    console.error(`  [AUTOMIZER] load() FAILED for ${filename}:`, err.message);
                    continue;
                }

                await addAllSlidesFromTemplate(pres, templateId, fullPath, label);
            }
        } else {
            const filename = sec.filename || `${(sec.name || folder).toLowerCase().replace(/\s+/g, '_')}.pptx`;
            const fullPath = path.join(templateDir, folder, filename);

            if (!fs.existsSync(fullPath)) {
                console.warn(`  ❌ [FIXED] ${label} → SKIP (not found): ${fullPath}`);
                continue;
            }

            const templateId = `fixed_${sec.order}_${path.basename(filename, '.pptx').replace(/[^a-z0-9]/gi, '_')}`;
            console.log(`  [AUTOMIZER] Loading fixed: ${filename} as "${templateId}"`);

            const relPath = path.relative(templateDir, fullPath).replace(/\\/g, '/');
            try {
                pres = pres.load(relPath, templateId);
            } catch (err) {
                console.error(`  [AUTOMIZER] load() FAILED for ${filename}:`, err.message);
                continue;
            }

            await addAllSlidesFromTemplate(pres, templateId, fullPath, label);
        }
    }

    const safeName = (formData.title || formData.projectName || formData.projectTitle || 'Report')
        .replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const outputFile = `${safeName}_${uuidv4().substring(0, 8)}.pptx`;

    await pres.write(outputFile);

    const outputPath = path.join(outputDir, outputFile);

    // Token replacement — inject frontend form data into slides (including financials)
    const formatDate = (val) => {
        if (!val) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };
    const projectName = formData.title || formData.projectName || formData.projectTitle || 'Untitled Project';
    const clientName = formData.clientName || formData.client_name || 'Confidential';
    const subtitle = formData.subtitle || formData.Subtitle || '';
    const dateStr = formData.date ? formatDate(formData.date) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const replacements = {
        '{{PROJECT_NAME}}': projectName, '{{CLIENT_NAME}}': clientName, '{{DATE}}': dateStr,
        '{{Title}}': projectName, '{{Subtitle}}': subtitle || clientName,
        '{{title}}': projectName, '{{subtitle}}': subtitle || clientName,
        '{{project_name}}': projectName, '{{client_name}}': clientName,
        '{{TITLE}}': projectName, '{{SUBTITLE}}': subtitle || clientName,
        '{{YEAR}}': new Date().getFullYear().toString(),
        '{{CITY}}': formData.city || formData.City || '',
        '{{PROPERTY_TYPE}}': formData.propertyType || formData.property_type || '',
        '{{ASSET_CATEGORY}}': formData.assetCategory || formData.asset_category || '',
        '{{NUMBER_OF_UNITS}}': String(formData.numberOfUnits ?? formData.number_of_units ?? formData.units ?? 'TBD'),
        '{{PRICE_RANGE}}': formData.priceRange || formData.price_range || '',
        '{{TOTAL_REVENUE}}': formData.totalRevenue || formData.total_revenue || 'TBD',
        '{{DEV_COST}}': formData.devCost || formData.dev_cost || 'TBD',
        '{{TARGET_IRR}}': formData.targetIRR || formData.target_irr || 'TBD',
        '{{PAYBACK_PERIOD}}': formData.paybackPeriod || formData.payback_period || 'TBD',
    };
    for (const [k, v] of Object.entries(formData)) {
        if (v != null && typeof v === 'string' && !replacements[`{{${k}}}`]) {
            replacements[`{{${k}}}`] = v;
        }
    }
    const JSZip = (await import('jszip')).default;
    const outZip = await JSZip.loadAsync(fs.readFileSync(outputPath));
    const xmlFiles = Object.keys(outZip.files).filter(f => f.endsWith('.xml'));
    for (const filePath of xmlFiles) {
        const sf = outZip.file(filePath);
        if (!sf || sf.dir) continue;
        let xml = await sf.async('string');
        let modified = false;
        for (const [token, value] of Object.entries(replacements)) {
            if (xml.includes(token)) { xml = xml.split(token).join(value); modified = true; }
        }
        if (modified) outZip.file(filePath, xml);
    }
    fs.writeFileSync(outputPath, await outZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }));

    const fileSize = fs.statSync(outputPath).size;
    const slideCount = countSlides(outputPath);

    console.log(`\n  ✅ DONE: ${outputFile} (${slideCount} slides, ${(fileSize / 1024).toFixed(1)} KB)\n`);

    return { fileName: outputFile, filePath: outputPath, fileSize, slideCount };
}

/**
 * Minimal test: add ONLY one varying file (e.g. dubai_residential_apartments_luxury)
 * at a specific position (after Site Assessment).
 * Run: node -e "import('./src/services/presentationServiceAutomizer.js').then(m => m.runMinimalTest())"
 */
export async function runMinimalTest() {
    const templateDir = getLibraryPath('Feasibility Study');
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const rootPath = path.join(templateDir, '01_Cover Page', 'cover.pptx');
    const sitePath = path.join(templateDir, '05_Site Assessment', 'site_assessment.pptx');
    const varyingPath = path.join(templateDir, '06_Market Overview', 'dubai_residential_apartments_luxury.pptx');

    if (!fs.existsSync(rootPath)) throw new Error('cover.pptx not found');
    if (!fs.existsSync(varyingPath)) throw new Error('dubai_residential_apartments_luxury.pptx not found');

    const automizer = new Automizer({
        templateDir,
        outputDir,
        removeExistingSlides: false,
        autoImportSlideMasters: true,
        verbosity: 2,
    });

    const rootRel = path.relative(templateDir, rootPath).replace(/\\/g, '/');
    const siteRel = path.relative(templateDir, sitePath).replace(/\\/g, '/');
    const marketRel = path.relative(templateDir, varyingPath).replace(/\\/g, '/');

    let pres = automizer.loadRoot(rootRel).load(rootRel, 'root').load(siteRel, 'site').load(marketRel, 'market_dubai');

    await addAllSlidesFromTemplate(pres, 'root', rootPath, 'Root');
    await addAllSlidesFromTemplate(pres, 'site', sitePath, 'Site');
    await addAllSlidesFromTemplate(pres, 'market_dubai', varyingPath, 'Market Dubai');

    const outFile = `test_automizer_${Date.now()}.pptx`;
    await pres.write(outFile);
    console.log(`\n✅ Minimal test output: ${path.join(outputDir, outFile)}`);
}

export default { assemblePresentationAutomizer, runMinimalTest, addAllSlidesFromTemplate };
