/**
 * ============================================================
 * SMART PRESENTATION MACHINE — PURE NODE.JS ASSEMBLY ENGINE
 * ============================================================

 *
 * This engine works at the ZIP level using PizZip to copy
 * slides with FULL fidelity: images, charts, tables, formatting.
 *
 * Flow:
 *   1. Read sections config from DB (order, varying/non-varying)
 *   2. For each section → find matching PPTX in Library folder
 *      - Non-varying: use fixed filename (cover.pptx, toc.pptx…)
 *      - Varying: build filename from user criteria
 *        e.g. City=Dubai, AssetType=Residential, Category=Apartments, Specs=Luxury
 *             → looks for: dubai_residential_apartments_luxury.pptx
 *   3. Copy ALL slides from source PPTX into output PPTX at ZIP level
 *   4. Save output file
 * ============================================================
 */

import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

// ============================================================
// XML NAMESPACES
// ============================================================
const NS = {
    p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
    r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    pr: 'http://schemas.openxmlformats.org/package/2006/relationships',
    ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
};

const SLIDE_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';
const LAYOUT_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout';

// ============================================================
// HELPER: Parse XML string → DOM
// ============================================================
function parseXml(str) {
    const parser = new DOMParser();
    return parser.parseFromString(str, 'application/xml');
}

// ============================================================
// HELPER: Serialize DOM → XML string
// ============================================================
function serializeXml(doc) {
    const s = new XMLSerializer();
    return s.serializeToString(doc);
}

// ============================================================
// HELPER: Get elements by tag+namespace
// ============================================================
function getEls(doc, ns, tag) {
    return Array.from(doc.getElementsByTagNameNS(ns, tag));
}

// ============================================================
// HELPER: Normalize string for filename matching
// Converts any separator style to lowercase underscores
// "High End" → "high_end", "High-End" → "high_end"
// ============================================================
function normalize(str) {
    return str.toLowerCase().trim().replace(/[\s\-+]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// ============================================================
// HELPER: Build all candidate filenames from criteria values
// Returns array of filenames to try, in priority order
// e.g. ['dubai_residential_apartments_luxury.pptx',
//        'dubai + residential + apartments + luxury.pptx']
// ============================================================
function buildCandidateFilenames(values) {
    const parts = values.map(v => normalize(v)).filter(Boolean);
    if (!parts.length) return [];
    return [
        parts.join('_') + '.pptx',           // dubai_residential_apartments_luxury.pptx
        parts.join(' + ') + '.pptx',          // dubai + residential + apartments + luxury.pptx
    ];
}

// ============================================================
// HELPER: Find a PPTX file in a folder
// Tries: exact filename → normalized match → first file (non-varying only)
// ============================================================
function findPptxInFolder(folderPath, filename = null) {
    if (!fs.existsSync(folderPath)) return null;

    const allFiles = fs.readdirSync(folderPath)
        .filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'));

    if (!allFiles.length) return null;

    // Non-varying: no filename specified → return first file
    if (!filename) return path.join(folderPath, allFiles[0]);

    // 1. Exact case-insensitive match
    const fl = filename.toLowerCase();
    const exact = allFiles.find(f => f.toLowerCase() === fl);
    if (exact) return path.join(folderPath, exact);

    // 2. Normalized match (ignores separator differences)
    const targetNorm = normalize(path.parse(filename).name);
    const fuzzy = allFiles.find(f => normalize(path.parse(f).name) === targetNorm);
    if (fuzzy) return path.join(folderPath, fuzzy);

    return null;
}

// ============================================================
// HELPER: Find PPTX for varying section criteria
// Tries all candidate filenames, then partial (City+AssetType)
// ============================================================
function findPptxForCriteria(folderPath, criteriaValues) {
    // Try full criteria (all 4 parts)
    for (const fname of buildCandidateFilenames(criteriaValues)) {
        const found = findPptxInFolder(folderPath, fname);
        if (found) {
            console.log(`      ✅ Matched: ${path.basename(found)}`);
            return found;
        }
    }

    // Try partial (first 2: City + AssetType)
    if (criteriaValues.length > 2) {
        for (const fname of buildCandidateFilenames(criteriaValues.slice(0, 2))) {
            const found = findPptxInFolder(folderPath, fname);
            if (found) {
                console.log(`      ⚠️  Partial match (City+AssetType): ${path.basename(found)}`);
                return found;
            }
        }
    }

    return null;
}

// ============================================================
// HELPER: Deduplicate plots by criteria values
// ============================================================
function deduplicatePlots(plots, criteriaKeys) {
    const seen = new Set();
    return plots.filter(plot => {
        const criteria = plot.criteria || plot || {};
        const key = criteriaKeys.map(k => {
            const val = Object.entries(criteria).find(([ck]) => ck.toLowerCase() === k.toLowerCase());
            return val ? normalize(val[1]) : '';
        }).join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ============================================================
// CORE: PptxAssembler (Pure Node.js / PizZip)
// Copies slides at ZIP level for full image/chart fidelity
// ============================================================
class PptxAssembler {
    constructor() {
        this.zip = null;
        this.slideCount = 0;
        this._initialized = false;
    }

    // Initialize from a blank PPTX template (minimal valid PPTX)
    init() {
        // Minimal valid PPTX structure as base64
        // This is a real empty PPTX with one blank slide master
        const BLANK_PPTX_B64 = this._getBlankPptxBase64();
        const buf = Buffer.from(BLANK_PPTX_B64, 'base64');
        this.zip = new PizZip(buf);
        this._removeAllSlides();
        this._initialized = true;
    }

    // Initialize from an existing PPTX file (preserves master/theme)
    initFromFile(filePath) {
        const buf = fs.readFileSync(filePath);
        this.zip = new PizZip(buf);
        this._removeAllSlides();
        this._initialized = true;
    }

    // Remove all slides from the loaded PPTX (keep master/layouts)
    _removeAllSlides() {
        const prsXml = this.zip.file('ppt/presentation.xml').asText();
        const prsDoc = parseXml(prsXml);

        // Clear sldIdLst
        const sldIdLsts = getEls(prsDoc, NS.p, 'sldIdLst');
        if (sldIdLsts.length) {
            const lst = sldIdLsts[0];
            while (lst.firstChild) lst.removeChild(lst.firstChild);
        }

        // Clear slide rels from presentation.xml.rels
        const prsRelsXml = this.zip.file('ppt/_rels/presentation.xml.rels').asText();
        const prsRelsDoc = parseXml(prsRelsXml);
        const rels = getEls(prsRelsDoc, NS.pr, 'Relationship');
        rels.forEach(rel => {
            if (rel.getAttribute('Type') === SLIDE_REL_TYPE) {
                rel.parentNode.removeChild(rel);
            }
        });

        // Remove slide files and their rels from ZIP
        const slideFiles = Object.keys(this.zip.files).filter(f =>
            /^ppt\/slides\/slide\d+\.xml$/.test(f)
        );
        const slideRels = Object.keys(this.zip.files).filter(f =>
            /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(f)
        );

        [...slideFiles, ...slideRels].forEach(f => this.zip.remove(f));

        // Clear slide content types
        const ctXml = this.zip.file('[Content_Types].xml').asText();
        const ctDoc = parseXml(ctXml);
        const overrides = getEls(ctDoc, NS.ct, 'Override');
        overrides.forEach(ov => {
            const pn = ov.getAttribute('PartName') || '';
            if (/^\/ppt\/slides\/slide\d+\.xml$/.test(pn)) {
                ov.parentNode.removeChild(ov);
            }
        });

        this.zip.file('ppt/presentation.xml', serializeXml(prsDoc));
        this.zip.file('ppt/_rels/presentation.xml.rels', serializeXml(prsRelsDoc));
        this.zip.file('[Content_Types].xml', serializeXml(ctDoc));
    }

    // ── CORE: Copy all slides from a source PPTX file ──
    addSlidesFromFile(sourcePath) {
        console.log(`      📄 Reading: ${path.basename(sourcePath)}`);
        const srcBuf = fs.readFileSync(sourcePath);
        const srcZip = new PizZip(srcBuf);

        // Find all slides in source, sorted by number
        const srcSlideFiles = Object.keys(srcZip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
            .sort((a, b) => {
                const na = parseInt(a.match(/\d+/)[0]);
                const nb = parseInt(b.match(/\d+/)[0]);
                return na - nb;
            });

        if (!srcSlideFiles.length) {
            console.log(`      ⚠️  No slides found in source file`);
            return 0;
        }

        // Read source content types for media type lookup
        const srcCtDoc = parseXml(srcZip.file('[Content_Types].xml').asText());
        const srcCtMap = {};
        getEls(srcCtDoc, NS.ct, 'Override').forEach(ov => {
            const pn = (ov.getAttribute('PartName') || '').replace(/^\//, '');
            const ct = ov.getAttribute('ContentType') || '';
            if (pn && ct) srcCtMap[pn] = ct;
        });
        getEls(srcCtDoc, NS.ct, 'Default').forEach(d => {
            const ext = d.getAttribute('Extension') || '';
            const ct = d.getAttribute('ContentType') || '';
            if (ext && ct) srcCtMap['.' + ext.toLowerCase()] = ct;
        });

        // Find a slideLayout in target to use as fallback
        const tgtLayouts = Object.keys(this.zip.files)
            .filter(f => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(f))
            .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
        const fallbackLayout = tgtLayouts.length ? tgtLayouts[0].split('/').pop() : null;

        // Read current target state
        let prsDoc = parseXml(this.zip.file('ppt/presentation.xml').asText());
        let prsRelsDoc = parseXml(this.zip.file('ppt/_rels/presentation.xml.rels').asText());
        let ctDoc = parseXml(this.zip.file('[Content_Types].xml').asText());

        // Find next slide number
        const existingSlides = Object.keys(this.zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
        let nextSlideNum = existingSlides.length + 1;

        // Find max rId in presentation.xml.rels
        let maxRid = 0;
        getEls(prsRelsDoc, NS.pr, 'Relationship').forEach(rel => {
            const rid = rel.getAttribute('Id') || '';
            const m = rid.match(/^rId(\d+)$/);
            if (m) maxRid = Math.max(maxRid, parseInt(m[1]));
        });
        let nextPrsRid = maxRid + 1;

        // Find max sldId
        const sldIdLsts = getEls(prsDoc, NS.p, 'sldIdLst');
        let sldIdLst = sldIdLsts.length ? sldIdLsts[0] : null;
        if (!sldIdLst) {
            sldIdLst = prsDoc.createElementNS(NS.p, 'p:sldIdLst');
            prsDoc.documentElement.appendChild(sldIdLst);
        }
        let maxSldId = 255;
        getEls(prsDoc, NS.p, 'sldId').forEach(s => {
            const id = parseInt(s.getAttribute('id') || '0');
            if (id > maxSldId) maxSldId = id;
        });
        let nextSldId = maxSldId + 1;

        let added = 0;

        for (const slidePath of srcSlideFiles) {
            const slideNum = nextSlideNum++;
            const newSlidePath = `ppt/slides/slide${slideNum}.xml`;
            const newSlideRelsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;

            // Read source slide XML
            const slideXml = srcZip.file(slidePath).asText();

            // Read source slide rels
            const srcSlideRelsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
            const srcSlideRelsFile = srcZip.file(srcSlideRelsPath);
            const srcRelsDoc = srcSlideRelsFile
                ? parseXml(srcSlideRelsFile.asText())
                : parseXml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>');

            const srcRels = getEls(srcRelsDoc, NS.pr, 'Relationship');

            // Build new rels for this slide
            const newRelsLines = [
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            ];

            for (const rel of srcRels) {
                const relType = rel.getAttribute('Type') || '';
                const relTarget = rel.getAttribute('Target') || '';
                const relMode = rel.getAttribute('TargetMode') || 'Internal';
                const relId = rel.getAttribute('Id') || '';

                // External (hyperlinks) — copy as-is
                if (relMode === 'External') {
                    newRelsLines.push(
                        `  <Relationship Id="${relId}" Type="${relType}" Target="${relTarget}" TargetMode="External"/>`
                    );
                    continue;
                }

                // slideLayout — point to target's first layout
                if (relType === LAYOUT_REL_TYPE) {
                    if (fallbackLayout) {
                        newRelsLines.push(
                            `  <Relationship Id="${relId}" Type="${relType}" Target="../slideLayouts/${fallbackLayout}"/>`
                        );
                    }
                    continue;
                }

                // Resolve source blob path
                let srcAbs;
                if (relTarget.startsWith('../')) {
                    srcAbs = 'ppt/' + relTarget.slice(3);
                } else if (relTarget.startsWith('/')) {
                    srcAbs = relTarget.slice(1);
                } else {
                    srcAbs = 'ppt/slides/' + relTarget;
                }

                // Copy blob from source to target with unique name
                const srcFile = srcZip.file(srcAbs);
                if (!srcFile) {
                    console.log(`      ⚠️  Missing blob: ${srcAbs}`);
                    continue;
                }

                const blob = srcFile.asBinary();
                const ext = path.extname(srcAbs).toLowerCase();
                const newBlobName = `ppt/media/${uuidv4().replace(/-/g, '')}${ext}`;

                this.zip.file(newBlobName, blob, { binary: true });

                // Determine content type
                const ct = srcCtMap[srcAbs] || srcCtMap[ext] || 'application/octet-stream';

                // Add content type override for blob
                const ctOverride = ctDoc.createElementNS(NS.ct, 'Override');
                ctOverride.setAttribute('PartName', '/' + newBlobName);
                ctOverride.setAttribute('ContentType', ct);
                ctDoc.documentElement.appendChild(ctOverride);

                // New relative target from slide
                const newTarget = '../media/' + path.basename(newBlobName);
                newRelsLines.push(
                    `  <Relationship Id="${relId}" Type="${relType}" Target="${newTarget}"/>`
                );
            }

            newRelsLines.push('</Relationships>');

            // Write slide XML and rels to target ZIP
            this.zip.file(newSlidePath, slideXml);
            this.zip.file(newSlideRelsPath, newRelsLines.join('\n'));

            // Add content type for slide
            const slideCtOverride = ctDoc.createElementNS(NS.ct, 'Override');
            slideCtOverride.setAttribute('PartName', '/' + newSlidePath);
            slideCtOverride.setAttribute('ContentType',
                'application/vnd.openxmlformats-officedocument.presentationml.slide+xml');
            ctDoc.documentElement.appendChild(slideCtOverride);

            // Register slide in presentation.xml sldIdLst
            const prsRid = `rId${nextPrsRid++}`;
            const sldIdEl = prsDoc.createElementNS(NS.p, 'p:sldId');
            sldIdEl.setAttribute('id', String(nextSldId++));
            sldIdEl.setAttributeNS(NS.r, 'r:id', prsRid);
            sldIdLst.appendChild(sldIdEl);

            // Register slide in presentation.xml.rels
            const prsRelEl = prsRelsDoc.createElementNS(NS.pr, 'Relationship');
            prsRelEl.setAttribute('Id', prsRid);
            prsRelEl.setAttribute('Type', SLIDE_REL_TYPE);
            prsRelEl.setAttribute('Target', `slides/slide${slideNum}.xml`);
            prsRelsDoc.documentElement.appendChild(prsRelEl);

            added++;
        }

        // Write updated XMLs back to ZIP
        this.zip.file('ppt/presentation.xml', serializeXml(prsDoc));
        this.zip.file('ppt/_rels/presentation.xml.rels', serializeXml(prsRelsDoc));
        this.zip.file('[Content_Types].xml', serializeXml(ctDoc));

        this.slideCount += added;
        return added;
    }

    // Save assembled PPTX to disk
    save(outputPath) {
        const buf = this.zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        fs.writeFileSync(outputPath, buf);
    }

    // Minimal blank PPTX (base64) — used only if no RootTemplate exists
    _getBlankPptxBase64() {
        // Read from a known good source file if available
        const rootTemplate = path.join(BACKEND_ROOT, 'Library', 'RootTemplate.pptx');
        if (fs.existsSync(rootTemplate)) {
            return fs.readFileSync(rootTemplate).toString('base64');
        }
        // Absolute fallback: use first available library file
        const libraryPath = path.join(BACKEND_ROOT, 'Library');
        const pptxFiles = [];
        function findPptx(dir) {
            if (!fs.existsSync(dir)) return;
            fs.readdirSync(dir).forEach(f => {
                const full = path.join(dir, f);
                if (fs.statSync(full).isDirectory()) findPptx(full);
                else if (f.endsWith('.pptx') && !f.startsWith('~$')) pptxFiles.push(full);
            });
        }
        findPptx(libraryPath);
        if (pptxFiles.length) return fs.readFileSync(pptxFiles[0]).toString('base64');
        throw new Error('No template PPTX found. Please ensure Library/RootTemplate.pptx exists.');
    }
}

// ============================================================
// SECTION NORMALIZER — Maps DB model fields to engine fields
// ============================================================
function normalizeSections(dbSections) {
    return dbSections
        .map(s => ({
            name: s.name,
            folderPath: s.folderPath || s.folder || s.name,
            isVarying: s.isVarying || s.varying || false,
            varyingCriteria: s.varyingCriteria || ['City', 'Asset Type', 'Category', 'Specifications'],
            filename: s.filename || null,
            order: s.order || 0,
        }))
        .sort((a, b) => a.order - b.order);
}

// ============================================================
// MAIN EXPORT: assemblePresentation
// ============================================================
export const assemblePresentation = async ({ presentationType, formData, plots, userId }) => {
    const libraryPath = path.join(BACKEND_ROOT, 'Library');
    const outputDir = path.join(BACKEND_ROOT, 'generated');
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏗️  ASSEMBLY ENGINE (Node.js / PizZip)`);
    console.log(`   Type  : "${presentationType.name}"`);
    console.log(`   Plots : ${plots?.length || 0}`);
    console.log(`   Form  : ${JSON.stringify(formData)}`);
    console.log(`${'='.repeat(60)}`);

    // ── Validate library ──
    if (!fs.existsSync(libraryPath)) {
        throw new Error(`Library folder not found: ${libraryPath}`);
    }

    // ── Normalize sections ──
    const sections = normalizeSections(presentationType.sections || []);
    if (!sections.length) {
        throw new Error(`No sections configured for "${presentationType.name}". Run the seed script.`);
    }

    console.log(`\n   📋 ${sections.length} sections to assemble (in order):`);
    sections.forEach(s => console.log(`      [${s.order}] ${s.name} | Varying: ${s.isVarying}`));

    // ── Initialize assembler ──
    const assembler = new PptxAssembler();
    const rootTemplate = path.join(libraryPath, 'RootTemplate.pptx');
    if (fs.existsSync(rootTemplate)) {
        assembler.initFromFile(rootTemplate);
        console.log(`\n   ✅ Initialized from RootTemplate.pptx`);
    } else {
        assembler.init();
        console.log(`\n   ⚠️  RootTemplate.pptx not found, using first library file as base`);
    }

    const libraryBase = path.join(libraryPath, presentationType.name);
    const addedSections = [];
    const skippedSections = [];
    let totalSlides = 0;

    // ── Process each section in order ──
    for (const section of sections) {
        const sectionDir = path.join(libraryBase, section.folderPath);

        console.log(`\n   📁 [${section.order}] ${section.name}`);
        console.log(`      Dir     : ${sectionDir}`);
        console.log(`      Varying : ${section.isVarying}`);

        if (!fs.existsSync(sectionDir)) {
            const msg = `${section.name} — folder not found: ${section.folderPath}`;
            skippedSections.push(msg);
            console.log(`      ⚠️  SKIP: folder not found`);
            continue;
        }

        // ── NON-VARYING SECTION ──
        if (!section.isVarying) {
            const sourcePath = findPptxInFolder(sectionDir, section.filename);
            if (!sourcePath) {
                const msg = `${section.name} — no PPTX file in folder`;
                skippedSections.push(msg);
                console.log(`      ⚠️  SKIP: no PPTX in folder`);
                continue;
            }

            try {
                const added = assembler.addSlidesFromFile(sourcePath);
                totalSlides += added;
                addedSections.push(`${section.name} (${added} slides)`);
                console.log(`      ✅ Added ${added} slides`);
            } catch (err) {
                skippedSections.push(`${section.name} — error: ${err.message}`);
                console.error(`      ❌ Error: ${err.message}`);
            }
            continue;
        }

        // ── VARYING SECTION ──
        const normalizedPlots = (plots || []).map(p => ({
            criteria: p.criteria || p || {}
        }));

        if (!normalizedPlots.length) {
            skippedSections.push(`${section.name} — no plots provided`);
            console.log(`      ⚠️  SKIP: no plots`);
            continue;
        }

        // Deduplicate plots for this section
        const uniquePlots = deduplicatePlots(normalizedPlots, section.varyingCriteria);
        console.log(`      🔀 ${normalizedPlots.length} plots → ${uniquePlots.length} unique`);

        let sectionSlides = 0;

        for (const plot of uniquePlots) {
            // Extract criteria values in order
            const values = section.varyingCriteria.map(key => {
                const entry = Object.entries(plot.criteria).find(
                    ([k]) => k.toLowerCase() === key.toLowerCase()
                );
                return entry ? entry[1] : null;
            }).filter(Boolean);

            // ── LOG: This is the critical debug line ──
            const candidateNames = buildCandidateFilenames(values);
            console.log(`      🔍 Criteria: ${JSON.stringify(values)}`);
            console.log(`         Trying  : ${candidateNames.join(' | ')}`);

            const sourcePath = findPptxForCriteria(sectionDir, values);

            if (!sourcePath) {
                skippedSections.push(`${section.name} — no match for: ${candidateNames[0]}`);
                console.log(`         ❌ NOT FOUND`);
                continue;
            }

            try {
                const added = assembler.addSlidesFromFile(sourcePath);
                totalSlides += added;
                sectionSlides += added;
                console.log(`         ✅ Added ${added} slides from ${path.basename(sourcePath)}`);
            } catch (err) {
                skippedSections.push(`${section.name} [${candidateNames[0]}] — error: ${err.message}`);
                console.error(`         ❌ Error: ${err.message}`);
            }
        }

        if (sectionSlides > 0) {
            addedSections.push(`${section.name} (${sectionSlides} slides)`);
        }
    }

    // ── Save output ──
    const safeTitle = (formData?.title || formData?.projectTitle || 'Presentation')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .slice(0, 50);
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const fileName = `${safeTitle}_${timestamp}_${uuidv4().slice(0, 6)}.pptx`;
    const filePath = path.join(outputDir, fileName);

    assembler.save(filePath);

    const fileSizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`   ✅ ASSEMBLY COMPLETE`);
    console.log(`   📊 Total Slides : ${totalSlides}`);
    console.log(`   📁 File         : ${fileName} (${fileSizeMB} MB)`);
    if (addedSections.length) {
        console.log(`   ✅ Added:`);
        addedSections.forEach(s => console.log(`      • ${s}`));
    }
    if (skippedSections.length) {
        console.log(`   ⚠️  Skipped:`);
        skippedSections.forEach(s => console.log(`      • ${s}`));
    }
    console.log(`${'='.repeat(60)}\n`);

    return { fileName, filePath, slideCount: totalSlides, addedSections, skippedSections };
};
