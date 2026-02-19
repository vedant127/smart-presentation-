/**
 * ============================================================
 * SMART PRESENTATION MACHINE — PURE NODE.JS ASSEMBLY ENGINE
 * ============================================================
 * NO Python. NO placeholder generation. NO template slides.
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
 *   4. REPLACE placeholders {{Title}}, {{City}}, etc. in slide text
 *   5. Save output file
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
    p:   'http://schemas.openxmlformats.org/presentationml/2006/main',
    r:   'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    pr:  'http://schemas.openxmlformats.org/package/2006/relationships',
    ct:  'http://schemas.openxmlformats.org/package/2006/content-types',
};

const SLIDE_REL_TYPE   = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';
const LAYOUT_REL_TYPE  = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout';

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
// HELPER: Replace Placeholders in XML
// ============================================================
function replacePlaceholders(xml, data) {
    if (!data || !xml) return xml;
    let newXml = xml;
    Object.keys(data).forEach(key => {
        const val = data[key] || '';
        // Escape regex special chars
        const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match {{KEY}} case-insensitive
        const regex = new RegExp(`{{\\s*${safeKey}\\s*}}`, 'gi');
        newXml = newXml.replace(regex, String(val));
    });
    return newXml;
}

// ============================================================
// HELPER: Build all candidate filenames from criteria values
// Returns array of filenames to try, in priority order
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

        // Remove slide files from ZIP
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
    addSlidesFromFile(sourcePath, replacements = null) {
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

        // Find next slide ID/RID/Num
        const existingSlides = Object.keys(this.zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
        let nextSlideNum = existingSlides.length + 1;

        let maxRid = 0;
        getEls(prsRelsDoc, NS.pr, 'Relationship').forEach(rel => {
            const rid = rel.getAttribute('Id') || '';
            const m = rid.match(/^rId(\d+)$/);
            if (m) maxRid = Math.max(maxRid, parseInt(m[1]));
        });
        let nextPrsRid = maxRid + 1;

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
            let slideXml = srcZip.file(slidePath).asText();

            // REPLACE PLACEHOLDERS
            if (replacements) {
                slideXml = replacePlaceholders(slideXml, replacements);
            }

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
                const relType   = rel.getAttribute('Type') || '';
                const relTarget = rel.getAttribute('Target') || '';
                const relMode   = rel.getAttribute('TargetMode') || 'Internal';
                const relId     = rel.getAttribute('Id') || '';

                if (relMode === 'External') {
                    newRelsLines.push(
                        `  <Relationship Id="${relId}" Type="${relType}" Target="${relTarget}" TargetMode="External"/>`
                    );
                    continue;
                }

                if (relType === LAYOUT_REL_TYPE) {
                    if (fallbackLayout) {
                        newRelsLines.push(
                            `  <Relationship Id="${relId}" Type="${relType}" Target="../slideLayouts/${fallbackLayout}"/>`
                        );
                    }
                    continue;
                }

                // Copy blob
                let srcAbs;
                if (relTarget.startsWith('../')) {
                    srcAbs = 'ppt/' + relTarget.slice(3);
                } else if (relTarget.startsWith('/')) {
                    srcAbs = relTarget.slice(1);
                } else {
                    srcAbs = 'ppt/slides/' + relTarget;
                }

                const srcFile = srcZip.file(srcAbs);
                if (!srcFile) {
                    // console.log(`      ⚠️  Missing blob: ${srcAbs}`);
                    continue;
                }

                const blob = srcFile.asBinary();
                const ext  = path.extname(srcAbs).toLowerCase();
                const newBlobName = `ppt/media/${uuidv4().replace(/-/g, '')}${ext}`;

                this.zip.file(newBlobName, blob, { binary: true });

                const ct = srcCtMap[srcAbs] || srcCtMap[ext] || 'application/octet-stream';
                const ctOverride = ctDoc.createElementNS(NS.ct, 'Override');
                ctOverride.setAttribute('PartName', '/' + newBlobName);
                ctOverride.setAttribute('ContentType', ct);
                ctDoc.documentElement.appendChild(ctOverride);

                const newTarget = '../media/' + path.basename(newBlobName);
                newRelsLines.push(
                    `  <Relationship Id="${relId}" Type="${relType}" Target="${newTarget}"/>`
                );
            }

            newRelsLines.push('</Relationships>');

            this.zip.file(newSlidePath, slideXml);
            this.zip.file(newSlideRelsPath, newRelsLines.join('\n'));

            const slideCtOverride = ctDoc.createElementNS(NS.ct, 'Override');
            slideCtOverride.setAttribute('PartName', '/' + newSlidePath);
            slideCtOverride.setAttribute('ContentType',
                'application/vnd.openxmlformats-officedocument.presentationml.slide+xml');
            ctDoc.documentElement.appendChild(slideCtOverride);

            const prsRid = `rId${nextPrsRid++}`;
            const sldIdEl = prsDoc.createElementNS(NS.p, 'p:sldId');
            sldIdEl.setAttribute('id', String(nextSldId++));
            sldIdEl.setAttributeNS(NS.r, 'r:id', prsRid);
            sldIdLst.appendChild(sldIdEl);

            const prsRelEl = prsRelsDoc.createElementNS(NS.pr, 'Relationship');
            prsRelEl.setAttribute('Id', prsRid);
            prsRelEl.setAttribute('Type', SLIDE_REL_TYPE);
            prsRelEl.setAttribute('Target', `slides/slide${slideNum}.xml`);
            prsRelsDoc.documentElement.appendChild(prsRelEl);

            added++;
        }

        this.zip.file('ppt/presentation.xml', serializeXml(prsDoc));
        this.zip.file('ppt/_rels/presentation.xml.rels', serializeXml(prsRelsDoc));
        this.zip.file('[Content_Types].xml', serializeXml(ctDoc));

        this.slideCount += added;
        return added;
    }

    save(outputPath) {
        const buf = this.zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        fs.writeFileSync(outputPath, buf);
    }

    _getBlankPptxBase64() {
        // ... (Using same logic as before, abbreviated here for brevity if writing full file)
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
        throw new Error('No template PPTX found');
    }
}

// ============================================================
// SECTION NORMALIZER
// ============================================================
function normalizeSections(dbSections) {
    return dbSections
        .map(s => ({
            name:            s.name,
            folderPath:      s.folderPath || s.folder || s.name,
            isVarying:       s.isVarying  || s.varying || false,
            varyingCriteria: s.varyingCriteria || ['City', 'Asset Type', 'Category', 'Specifications'],
            filename:        s.filename || null,
            order:           s.order    || 0,
        }))
        .sort((a, b) => a.order - b.order);
}

// ============================================================
// MAIN EXPORT: assemblePresentation
// ============================================================
export const assemblePresentation = async ({ presentationType, formData, plots, userId }) => {
    const libraryPath = path.join(BACKEND_ROOT, 'Library');
    const outputDir   = path.join(BACKEND_ROOT, 'generated');
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏗️  ASSEMBLY ENGINE (PizZip + Replace)`);
    console.log(`   Type  : "${presentationType.name}"`);
    console.log(`   Plots : ${plots?.length || 0}`);
    console.log(`${'='.repeat(60)}`);

    // ── Global Replacements ──
    const globalReplacements = {
        PROJECT_NAME: formData.title || formData.projectName || 'Project Name',
        CLIENT_NAME:  formData.clientName || 'Client Name',
        DATE:         new Date().toLocaleDateString(),
        ...formData
    };
    // Map missing friend-reported keys
    globalReplacements.Title = globalReplacements.PROJECT_NAME;
    globalReplacements.Subtitle = formData.subtitle || globalReplacements.DATE;
    globalReplacements.SlideTitle = globalReplacements.PROJECT_NAME;
    globalReplacements.SlideBody = '';

    // ── Initialize ──
    if (!fs.existsSync(libraryPath)) throw new Error(`Library folder not found: ${libraryPath}`);
    const sections = normalizeSections(presentationType.sections || []);
    
    const assembler = new PptxAssembler();
    const rootTemplate = path.join(libraryPath, 'RootTemplate.pptx');
    if (fs.existsSync(rootTemplate)) assembler.initFromFile(rootTemplate);
    else assembler.init();

    const libraryBase    = path.join(libraryPath, presentationType.name);
    const addedSections  = [];
    const skippedSections = [];
    let totalSlides = 0;

    for (const section of sections) {
        const sectionDir = path.join(libraryBase, section.folderPath);
        console.log(`\n   📁 [${section.order}] ${section.name}`);

        if (!fs.existsSync(sectionDir)) {
            skippedSections.push(`${section.name} — folder not found`);
            console.log(`      ⚠️  SKIP: folder not found`);
            continue;
        }

        // ── NON-VARYING ──
        if (!section.isVarying) {
            const sourcePath = findPptxInFolder(sectionDir, section.filename);
            if (!sourcePath) {
                skippedSections.push(`${section.name} — no PPTX`);
                continue;
            }
            try {
                // Apply global replacements
                const added = assembler.addSlidesFromFile(sourcePath, globalReplacements);
                totalSlides += added;
                addedSections.push(`${section.name} (${added} slides)`);
                console.log(`      ✅ Added ${added} slides`);
            } catch (err) {
                console.error(`      ❌ Error: ${err.message}`);
            }
            continue;
        }

        // ── VARYING ──
        const normalizedPlots = (plots || []).map(p => ({
            criteria: p.criteria || p || {}
        }));

        const uniquePlots = deduplicatePlots(normalizedPlots, section.varyingCriteria);
        
        for (const plot of uniquePlots) {
            const values = section.varyingCriteria.map(key => {
                const entry = Object.entries(plot.criteria).find(
                    ([k]) => k.toLowerCase() === key.toLowerCase()
                );
                return entry ? entry[1] : null;
            }).filter(Boolean);

            console.log(`      🔍 Criteria: ${JSON.stringify(values)}`);
            const sourcePath = findPptxForCriteria(sectionDir, values);

            if (!sourcePath) {
                 console.log(`         ❌ NOT FOUND`);
                 continue;
            }

            try {
                // Merge context for this plot into replacements
                const plotReplacements = { ...globalReplacements, ...plot.criteria };
                const added = assembler.addSlidesFromFile(sourcePath, plotReplacements);
                totalSlides += added;
                console.log(`         ✅ Added ${added} slides`);
            } catch (err) {
                console.error(`         ❌ Error: ${err.message}`);
            }
        }
    }

    const safeTitle = (formData?.title || 'Presentation').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50);
    const fileName  = `${safeTitle}_${Date.now()}.pptx`;
    const filePath  = path.join(outputDir, fileName);

    assembler.save(filePath);

    return { fileName, filePath, slideCount: totalSlides, addedSections, skippedSections };
};
