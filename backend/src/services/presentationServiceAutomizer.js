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
import { v4 as uuidv4 } from 'uuid';
import { Automizer } from 'pptx-automizer';
import PizZip from 'pizzip';

// ─── Same VALUE_MAP & buildKey as presentationServiceNew ─────────────────────
const VALUE_MAP = {
    'hotels': 'hotel', 'hotel': 'hotel', 'residential': 'residential', 'office': 'office', 'retail': 'retail',
    '3-star': '3_star', '3 star': '3_star', '4-star': '4_star', '4 star': '4_star',
    '5-star': '5_star', '5 star': '5_star',
    'small regional mall': 'small_regional_mall', 'regional mall': 'regional_mall',
    'community mall': 'community_mall', 'neighbourhood center': 'neighbourhood_center',
    'convenience center': 'convenience_center',
    'beach resort': 'beach_resort', 'business': 'business', 'city': 'city', 'leisure': 'leisure',
    'apartments': 'apartments', 'villas': 'villas', 'townhouses': 'townhouses',
    'luxury': 'luxury', 'high end': 'high_end', 'upper mid end': 'upper_mid_end', 'mid end': 'mid_end',
    'low end': 'low_end', 'affordable': 'affordable', 'social': 'social',
    'grade a': 'grade_a', 'grade b': 'grade_b',
    'abu dhabi': 'abu_dhabi', 'abudhabi': 'abu_dhabi', 'dubai': 'dubai', 'riyadh': 'riyadh', 'jeddah': 'jeddah',
};

function normToken(val) {
    if (!val || typeof val !== 'string') return '';
    const lower = String(val).trim().toLowerCase();
    const withUnderscores = lower.replace(/\s+/g, '_').replace(/-/g, '_');
    return VALUE_MAP[lower] ?? VALUE_MAP[withUnderscores] ?? withUnderscores.replace(/[^a-z0-9_]/g, '');
}

function buildKey(criteria) {
    if (!criteria || typeof criteria !== 'object') return '';
    const raw = [
        criteria.City || criteria.city || '',
        criteria['Asset Type'] || criteria.assetType || criteria.asset_type || '',
        criteria.Category || criteria.category || '',
        criteria.Specifications || criteria.specifications || criteria.specs || criteria.spec || '',
    ];
    const parts = raw.map(s => normToken(String(s || '')));
    return parts.filter(s => s.length > 0).join('_');
}

function getUniqueKeys(plots) {
    const uniqueKeys = new Set();
    for (const plot of plots || []) {
        const criteria = plot.criteria || plot.data || plot;
        const key = buildKey(criteria);
        if (key) uniqueKeys.add(key);
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
    const cwd = process.cwd();
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const libRoot = path.join(cwd, 'Library');
    const candidates = [
        path.join(cwd, 'Library', typeName),
        path.join(cwd, '..', 'Library', typeName),
        path.join(cwd, 'src', 'Library', typeName),
        path.join(__dirname, '..', '..', 'Library', typeName),
        path.join(cwd, 'Library', 'Feasibility Study'),
        path.join(cwd, '..', 'Library', 'Feasibility Study'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    if (fs.existsSync(libRoot)) return path.join(libRoot, typeName);
    throw new Error(`Library folder not found for type: ${typeName}`);
}

// ─── pptx-automizer assembly ──────────────────────────────────────────────────

/**
 * Bulletproof addSlide loop for varying files.
 * Guarantees all slides are added with correct template reference.
 *
 * @param {object} pres - Automizer instance (after loadRoot + loads)
 * @param {string} templateId - Label used in pres.load(fullPath, templateId)
 * @param {string} fullPath - Absolute path to PPTX file
 * @param {string} label - Log label (e.g. "Market Overview")
 */
async function addAllSlidesFromTemplate(pres, templateId, fullPath, label) {
    const zip = new PizZip(fs.readFileSync(fullPath));
    const slidePaths = Object.keys(zip.files)
        .filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k))
        .sort((a, b) => parseInt(a.match(/slide(\d+)/)[1]) - parseInt(b.match(/slide(\d+)/)[1]));

    const slideCount = slidePaths.length;
    console.log(`  [AUTOMIZER] Template "${templateId}" registered from ${path.basename(fullPath)}`);
    console.log(`  [AUTOMIZER] About to add ${slideCount} slides from ${templateId}`);

    if (slideCount === 0) {
        console.warn(`  [AUTOMIZER] WARNING: No slides found in ${fullPath}`);
        return;
    }

    for (let i = 1; i <= slideCount; i++) {
        try {
            pres.addSlide(templateId, i);
            console.log(`  [AUTOMIZER] ✓ Added slide ${i}/${slideCount} from ${templateId}`);
        } catch (err) {
            console.error(`  [AUTOMIZER] ✗ addSlide(${templateId}, ${i}) FAILED:`, err.message);
            throw err;
        }
    }
    console.log(`  [AUTOMIZER] Finished adding ${slideCount} slides from ${templateId}`);
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
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const uniqueKeys = getUniqueKeys(plots || []);
    console.log('Unique keys:', uniqueKeys);

    // Root: use first fixed file (cover) or RootTemplate if exists
    const rootCandidates = [
        path.join(templateDir, '01_Cover Page', 'cover.pptx'),
        path.join(templateDir, '01_Cover Page', 'Cover.pptx'),
        path.join(process.cwd(), 'Library', 'RootTemplate.pptx'),
    ];
    let rootPath = rootCandidates.find(p => fs.existsSync(p));
    if (!rootPath) {
        const coverDir = path.join(templateDir, '01_Cover Page');
        if (fs.existsSync(coverDir)) {
            const first = fs.readdirSync(coverDir).find(f => f.endsWith('.pptx'));
            if (first) rootPath = path.join(coverDir, first);
        }
    }
    if (!rootPath || !fs.existsSync(rootPath)) {
        throw new Error('Root template not found. Need cover.pptx or RootTemplate.pptx in Library.');
    }

    console.log(`  [AUTOMIZER] Root: ${path.basename(rootPath)}`);

    // templateDir = Library/Feasibility Study so we can load "01_Cover Page/cover.pptx", "06_Market Overview/xxx.pptx"
    const automizer = new Automizer({
        templateDir,
        outputDir,
        removeExistingSlides: true,
        autoImportSlideMasters: true,  // CRITICAL: imports layout so varying slides render
        verbosity: 1,
    });

    // loadRoot expects path relative to templateDir (provides theme/masters)
    const rootRel = path.relative(templateDir, rootPath).replace(/\\/g, '/');
    let pres = automizer.loadRoot(rootRel);

    // Root is truncated. Load root file again as template 'root' and add its slides.
    pres = pres.load(rootRel, 'root');
    await addAllSlidesFromTemplate(pres, 'root', rootPath, 'Root/Cover');

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

        if (sec.isVarying && !sec.filename) {
            for (const key of uniqueKeys) {
                const filename = `${key}.pptx`;
                const fullPath = path.join(templateDir, folder, filename);

                if (!fs.existsSync(fullPath)) {
                    console.warn(`  ⚠️ [VARYING] ${label} → SKIP (not found): ${filename}`);
                    continue;
                }

                const templateId = `var_${key.replace(/[^a-z0-9]/gi, '_')}`;
                console.log(`  [AUTOMIZER] Loading varying: ${filename} as "${templateId}"`);

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

    // Token replacement (project name, client, date)
    const projectName = formData.title || formData.projectName || formData.projectTitle || 'Untitled Project';
    const clientName = formData.clientName || formData.client_name || 'Confidential';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const replacements = {
        '{{PROJECT_NAME}}': projectName, '{{CLIENT_NAME}}': clientName, '{{DATE}}': dateStr,
        '{{Title}}': projectName, '{{Subtitle}}': clientName,
        '{{title}}': projectName, '{{subtitle}}': clientName,
        '{{project_name}}': projectName, '{{client_name}}': clientName,
        '{{TITLE}}': projectName, '{{SUBTITLE}}': clientName,
        '{{YEAR}}': new Date().getFullYear().toString(),
    };
    const JSZip = (await import('jszip')).default;
    const outZip = await JSZip.loadAsync(fs.readFileSync(outputPath));
    const slidePaths = Object.keys(outZip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    for (const slidePath of slidePaths) {
        const sf = outZip.file(slidePath);
        if (!sf || sf.dir) continue;
        let xml = await sf.async('string');
        let modified = false;
        for (const [token, value] of Object.entries(replacements)) {
            if (xml.includes(token)) { xml = xml.split(token).join(value); modified = true; }
        }
        if (modified) outZip.file(slidePath, xml);
    }
    fs.writeFileSync(outputPath, await outZip.generateAsync({ type: 'nodebuffer' }));

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
        removeExistingSlides: true,
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
