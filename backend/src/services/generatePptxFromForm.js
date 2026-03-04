/**
 * generatePptxFromForm.js
 * Hybrid: Uses Library + pptx-automizer when available (rich varying sections),
 * falls back to pptxgenjs when Library missing.
 * Fixes: bullets, Project Scope table, numberOfUnits, financials, price-in-key.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import PptxGenJS from 'pptxgenjs';
import { formDataToCriteria } from '../utils/keyBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, '..', '..');

const FEASIBILITY_SECTIONS = [
  { name: 'Cover Page', order: 1, isVarying: false, folderPath: '01_Cover Page', filename: 'cover.pptx' },
  { name: 'Table of Contents', order: 2, isVarying: false, folderPath: '02_Table of Contents', filename: 'toc.pptx' },
  { name: 'Project Background', order: 3, isVarying: false, folderPath: '03_Project Background', filename: 'project_background.pptx' },
  { name: 'Executive Summary', order: 4, isVarying: false, folderPath: '04_Executive Summary', filename: 'executive_summary.pptx' },
  { name: 'Site Assessment', order: 5, isVarying: false, folderPath: '05_Site Assessment', filename: 'site_assessment.pptx' },
  { name: 'Market Overview', order: 6, isVarying: true, folderPath: '06_Market Overview', varyingCriteria: ['City', 'Asset Type', 'Category', 'Specifications'] },
  { name: 'Development Recommendations Part 1', order: 7, isVarying: false, folderPath: '07_Development Recommendations Part 1', filename: 'devrec_part1.pptx' },
  { name: 'Development Recommendations Part 2', order: 8, isVarying: true, folderPath: '08_Development Recommendations Part 2', varyingCriteria: ['City', 'Asset Type', 'Category', 'Specifications'] },
  { name: 'Development Recommendations Part 3', order: 9, isVarying: false, folderPath: '09_Development Recommendations Part 3', filename: 'devrec_part3.pptx' },
  { name: 'Financial & Investment Analysis', order: 10, isVarying: false, folderPath: '10_Financial & Investment Analysis', filename: 'financial_investment_analysis.pptx' },
  { name: 'Disclaimer', order: 11, isVarying: false, folderPath: '11_Disclaimer', filename: 'disclaimer.pptx' },
];

// ─── COLORS & FONTS (match reference design) ──────────────────────────────────
const NAVY = '1B2A4A';
const GOLD = 'C9A84C';
const WHITE = 'FFFFFF';
const LGRAY = 'F4F4F4';
const DGRAY = '444444';
const FONT_TITLE = 'Century Schoolbook';
const FONT_BODY = 'Arial';

// ══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function addGoldRule(slide) {
  slide.addShape('rect', { x: 0, y: 1.18, w: 10, h: 0.04, fill: { color: GOLD }, line: { color: GOLD } });
}

function addNavyHeader(slide, sectionLabel, slideTitle) {
  slide.addShape('rect', { x: 0, y: 0, w: 10, h: 1.18, fill: { color: NAVY }, line: { color: NAVY } });
  addGoldRule(slide);
  slide.addText(sectionLabel.toUpperCase(), {
    x: 0.3, y: 0.08, w: 9, h: 0.3,
    fontSize: 9, color: GOLD, fontFace: FONT_BODY, bold: false,
  });
  slide.addText(slideTitle, {
    x: 0.3, y: 0.38, w: 9, h: 0.72,
    fontSize: 22, color: WHITE, fontFace: FONT_TITLE, bold: true, valign: 'middle',
  });
}

function addFooter(slide, pageNum, total) {
  slide.addText(`© Smart Presentation Solutions   |   ${pageNum} of ${total}`, {
    x: 0, y: 7.3, w: 10, h: 0.2,
    fontSize: 7, color: '999999', fontFace: FONT_BODY, align: 'center',
  });
}

function addSectionDivider(pptx, sectionNum, sectionTitle) {
  const slide = pptx.addSlide();
  slide.addShape('rect', { x: 0, y: 0, w: 10, h: 7.5, fill: { color: NAVY }, line: { color: NAVY } });
  slide.addShape('rect', { x: 0.6, y: 2.8, w: 0.07, h: 2.0, fill: { color: GOLD }, line: { color: GOLD } });
  slide.addText(sectionNum, {
    x: 0.9, y: 2.7, w: 8, h: 1.4,
    fontSize: 60, color: WHITE, fontFace: FONT_TITLE, bold: false, valign: 'middle',
  });
  slide.addText(sectionTitle, {
    x: 0.9, y: 4.0, w: 8, h: 0.8,
    fontSize: 24, color: WHITE, fontFace: FONT_TITLE, bold: false, valign: 'middle',
  });
  slide.addShape('rect', { x: 0, y: 7.2, w: 10, h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
  slide.addText('CORPORATE PRESENTATION', {
    x: 0, y: 7.3, w: 10, h: 0.2,
    fontSize: 7, color: '888888', fontFace: FONT_BODY, align: 'center',
  });
  return slide;
}

function slide_whiteBg(slide) {
  slide.addShape('rect', { x: 0, y: 0, w: 10, h: 7.5, fill: { color: WHITE }, line: { color: WHITE } });
}

function addTwoColumns(slide, leftTitle, leftItems, rightTitle, rightItems, startY) {
  slide.addShape('rect', { x: 0.4, y: startY, w: 4.3, h: 0.42, fill: { color: NAVY }, line: { color: NAVY } });
  slide.addText(leftTitle, { x: 0.4, y: startY, w: 4.3, h: 0.42, fontSize: 12, color: WHITE, fontFace: FONT_BODY, bold: true, align: 'center', valign: 'middle' });
  slide.addShape('rect', { x: 5.3, y: startY, w: 4.3, h: 0.42, fill: { color: NAVY }, line: { color: NAVY } });
  slide.addText(rightTitle, { x: 5.3, y: startY, w: 4.3, h: 0.42, fontSize: 12, color: WHITE, fontFace: FONT_BODY, bold: true, align: 'center', valign: 'middle' });

  leftItems.forEach((item, i) => {
    const y = startY + 0.5 + i * 0.58;
    slide.addShape('rect', { x: 0.4, y, w: 4.3, h: 0.5, fill: { color: i % 2 === 0 ? LGRAY : WHITE }, line: { color: 'DDDDDD', width: 0.5 } });
    slide.addText(`• ${item}`, { x: 0.55, y: y + 0.05, w: 4.0, h: 0.4, fontSize: 11, color: DGRAY, fontFace: FONT_BODY });
  });

  rightItems.forEach((item, i) => {
    const y = startY + 0.5 + i * 0.58;
    slide.addShape('rect', { x: 5.3, y, w: 4.3, h: 0.5, fill: { color: i % 2 === 0 ? LGRAY : WHITE }, line: { color: 'DDDDDD', width: 0.5 } });
    slide.addText(`• ${item}`, { x: 5.45, y: y + 0.05, w: 4.0, h: 0.4, fontSize: 11, color: DGRAY, fontFace: FONT_BODY });
  });
}

/** Format date: "2026-03-04" → "March 2026" */
function formatDate(val) {
  if (!val) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

// ══════════════════════════════════════════════════════════════════════════════
//  SLIDE BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

function buildCoverSlide(pptx, data) {
  const slide = pptx.addSlide();

  // STEP 1: Full background IMAGE (city skyline photo) — check multiple locations
  const coverPaths = [
    path.join(backendRoot, 'public', 'images', 'cover_bg.jpg'),
    path.join(backendRoot, 'public', 'images', 'cover_bg.png'),
    path.join(backendRoot, 'Library', 'assets', 'cover-bg.jpg'),
    path.join(backendRoot, 'Library', 'assets', 'cover-bg.png'),
    path.join(process.cwd(), 'public', 'images', 'cover_bg.jpg'),
    path.join(process.cwd(), 'Library', 'assets', 'cover-bg.jpg'),
  ];
  const bgImagePath = coverPaths.find(p => fs.existsSync(p));

  if (bgImagePath) {
    slide.addImage({
      path: bgImagePath,
      x: 0, y: 0, w: 10, h: 7.5,
    });
  } else {
    slide.addShape('rect', {
      x: 0, y: 0, w: 10, h: 7.5,
      fill: { color: NAVY }, line: { color: NAVY },
    });
  }

  // STEP 2: Dark navy overlay on BOTTOM HALF only (so photo shows on top)
  slide.addShape('rect', {
    x: 0, y: 3.8, w: 10, h: 3.7,
    fill: { color: NAVY, transparency: 15 },
    line: { color: NAVY },
  });

  // STEP 3: Gold accent line above text area
  slide.addShape('rect', {
    x: 0, y: 3.75, w: 10, h: 0.06,
    fill: { color: GOLD }, line: { color: GOLD },
  });

  // Top label — REAL ESTATE
  slide.addText('REAL ESTATE', {
    x: 0.5, y: 4.0, w: 6, h: 0.35,
    fontSize: 11, color: GOLD, fontFace: FONT_BODY, charSpacing: 4,
  });

  // FEASIBILITY STUDY
  slide.addText('FEASIBILITY STUDY', {
    x: 0.5, y: 4.35, w: 6, h: 0.45,
    fontSize: 16, color: WHITE, fontFace: FONT_TITLE, charSpacing: 2,
  });

  // City name
  slide.addText((data.city || 'N/A').toUpperCase(), {
    x: 0.5, y: 4.8, w: 6, h: 0.35,
    fontSize: 11, color: GOLD, fontFace: FONT_BODY, charSpacing: 3,
  });

  // Project title (large)
  slide.addText(data.projectTitle || 'Feasibility Study', {
    x: 0.5, y: 5.2, w: 8, h: 0.9,
    fontSize: 26, color: WHITE, fontFace: FONT_TITLE, bold: false, valign: 'middle',
  });

  // Gold underline
  slide.addShape('rect', {
    x: 0.5, y: 6.1, w: 3.5, h: 0.05,
    fill: { color: GOLD }, line: { color: GOLD },
  });

  // Client + Date
  slide.addText(`${data.clientName || 'Confidential'}  |  ${data.date || ''}`, {
    x: 0.5, y: 6.25, w: 6, h: 0.3,
    fontSize: 10, color: 'CCCCCC', fontFace: FONT_BODY,
  });

  // Bottom bar
  slide.addShape('rect', {
    x: 0, y: 7.2, w: 10, h: 0.3,
    fill: { color: GOLD }, line: { color: GOLD },
  });
  slide.addText('CORPORATE PRESENTATION', {
    x: 0, y: 7.22, w: 10, h: 0.26,
    fontSize: 8, color: NAVY, fontFace: FONT_BODY, align: 'center', bold: true,
  });
}

function buildTocDivider(pptx) {
  const slide = pptx.addSlide();
  slide.addShape('rect', { x: 0, y: 0, w: 10, h: 7.5, fill: { color: NAVY }, line: { color: NAVY } });
  slide.addText('Table of Contents', {
    x: 1, y: 3.0, w: 8, h: 1.2,
    fontSize: 36, color: WHITE, fontFace: FONT_TITLE, align: 'center', valign: 'middle',
  });
  slide.addShape('rect', { x: 3, y: 4.3, w: 4, h: 0.06, fill: { color: GOLD }, line: { color: GOLD } });
}

function buildTocContent(pptx, sections, totalPages) {
  const slide = pptx.addSlide();
  slide.addShape('rect', { x: 0, y: 0, w: 10, h: 7.5, fill: { color: LGRAY }, line: { color: LGRAY } });
  slide.addShape('rect', { x: 0, y: 0, w: 10, h: 0.55, fill: { color: NAVY }, line: { color: NAVY } });
  slide.addShape('rect', { x: 0, y: 0.55, w: 10, h: 0.04, fill: { color: GOLD }, line: { color: GOLD } });
  slide.addText('Table of Contents', {
    x: 0.3, y: 0.08, w: 9, h: 0.4,
    fontSize: 18, color: WHITE, fontFace: FONT_TITLE, bold: true,
  });

  const leftItems = sections.slice(0, Math.ceil(sections.length / 2));
  const rightItems = sections.slice(Math.ceil(sections.length / 2));

  leftItems.forEach((item, i) => {
    const y = 0.85 + i * 0.78;
    slide.addShape('rect', { x: 0.3, y, w: 0.45, h: 0.45, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addText(`${i + 1}`, { x: 0.3, y, w: 0.45, h: 0.45, fontSize: 14, color: GOLD, fontFace: FONT_TITLE, align: 'center', valign: 'middle' });
    slide.addText(item, { x: 0.88, y: y + 0.02, w: 3.9, h: 0.42, fontSize: 12, color: NAVY, fontFace: FONT_BODY, bold: true, valign: 'middle' });
  });

  rightItems.forEach((item, i) => {
    const y = 0.85 + i * 0.78;
    const num = leftItems.length + i + 1;
    slide.addShape('rect', { x: 5.3, y, w: 0.45, h: 0.45, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addText(`${num}`, { x: 5.3, y, w: 0.45, h: 0.45, fontSize: 14, color: GOLD, fontFace: FONT_TITLE, align: 'center', valign: 'middle' });
    slide.addText(item, { x: 5.88, y: y + 0.02, w: 3.9, h: 0.42, fontSize: 12, color: NAVY, fontFace: FONT_BODY, bold: true, valign: 'middle' });
  });

  addFooter(slide, 3, totalPages);
}

function buildProjectBackground(pptx, data, pageStart, totalPages) {
  addSectionDivider(pptx, '1.', 'Project Background');

  const s1 = pptx.addSlide();
  slide_whiteBg(s1);
  addNavyHeader(s1, '1. Project Background', 'Project Overview');
  s1.addText(
    `This feasibility study covers the ${data.propertyType} market in ${data.city}. ` +
    `The project targets the ${data.assetCategory} segment with a focus on ${data.priceRange} positioning.`,
    { x: 0.4, y: 1.35, w: 9.2, h: 0.8, fontSize: 13, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
  );
  addFooter(s1, pageStart + 1, totalPages);

  const s2 = pptx.addSlide();
  slide_whiteBg(s2);
  addNavyHeader(s2, '1. Project Background', 'Project Scope');

  const scopeRows = [
    ['Location', data.city],
    ['Property Type', data.propertyType],
    ['Asset Category', data.assetCategory],
    ['Number of Units', data.numberOfUnits],
    ['Price Range', data.priceRange],
    ['Client', data.clientName],
  ];

  scopeRows.forEach(([label, value], i) => {
    const y = 1.4 + i * 0.72;
    const rowBg = i % 2 === 0 ? LGRAY : WHITE;
    s2.addShape('rect', { x: 0.4, y, w: 9.2, h: 0.62, fill: { color: rowBg }, line: { color: 'DDDDDD', width: 0.5 } });
    s2.addText(label, { x: 0.55, y: y + 0.1, w: 3, h: 0.42, fontSize: 12, color: NAVY, fontFace: FONT_BODY, bold: true });
    s2.addText(value, { x: 3.7, y: y + 0.1, w: 5.7, h: 0.42, fontSize: 12, color: DGRAY, fontFace: FONT_BODY });
  });

  addFooter(s2, pageStart + 2, totalPages);
}

function buildExecutiveSummary(pptx, data, pageStart, totalPages) {
  addSectionDivider(pptx, '2.', 'Executive Summary');

  const s1 = pptx.addSlide();
  slide_whiteBg(s1);
  addNavyHeader(s1, '2. Executive Summary', 'Key Findings');
  s1.addText(
    `The ${data.city} market for ${data.propertyType} in the ${data.assetCategory} segment shows strong potential. ` +
    `With ${data.numberOfUnits} units targeting the ${data.priceRange} segment, ` +
    `the project aligns with current demand drivers.`,
    { x: 0.4, y: 1.35, w: 9.2, h: 0.9, fontSize: 13, color: DGRAY, fontFace: FONT_BODY }
  );
  const kpis = [
    { label: 'City', value: data.city },
    { label: 'Property Type', value: data.propertyType },
    { label: 'Units', value: data.numberOfUnits },
    { label: 'Price Range', value: data.priceRange },
  ];
  kpis.forEach((kpi, i) => {
    const x = 0.4 + i * 2.32;
    s1.addShape('rect', { x, y: 2.45, w: 2.1, h: 1.3, fill: { color: NAVY }, line: { color: NAVY } });
    s1.addText(kpi.value, { x, y: 2.55, w: 2.1, h: 0.7, fontSize: 18, color: GOLD, fontFace: FONT_TITLE, align: 'center', valign: 'middle' });
    s1.addText(kpi.label, { x, y: 3.15, w: 2.1, h: 0.55, fontSize: 10, color: WHITE, fontFace: FONT_BODY, align: 'center', valign: 'middle' });
  });
  addFooter(s1, pageStart + 1, totalPages);

  const s2 = pptx.addSlide();
  slide_whiteBg(s2);
  addNavyHeader(s2, '2. Executive Summary', 'Recommendations');
  const recItems = [
    `Proceed with development based on market alignment with ${data.city} demand drivers`,
    `Consider phased approach for risk mitigation across the ${data.priceRange} segment`,
    'Monitor key market indicators during implementation',
    `Engage local regulatory authorities early for ${data.propertyType} approvals`,
  ];
  s2.addText(
    recItems.map(t => ({ text: t, options: { bullet: { type: 'bullet' }, breakLine: true, paraSpaceAfter: 8 } })),
    { x: 0.5, y: 1.4, w: 9, h: 5.5, fontSize: 13, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
  );
  addFooter(s2, pageStart + 2, totalPages);
}

function buildSiteAssessment(pptx, data, pageStart, totalPages) {
  addSectionDivider(pptx, '3.', 'Site Assessment');

  const s1 = pptx.addSlide();
  slide_whiteBg(s1);
  addNavyHeader(s1, '3. Site Assessment', 'Site Location & Context');
  s1.addText(
    `The proposed site in ${data.city} benefits from strong connectivity and visibility. ` +
    `The ${data.propertyType} development will leverage the city's infrastructure and ${data.assetCategory} demand profile.`,
    { x: 0.4, y: 1.35, w: 9.2, h: 0.9, fontSize: 13, color: DGRAY, fontFace: FONT_BODY }
  );
  const leftPoints = [
    `Strategic location in ${data.city}`,
    'Access to major road networks',
    'Proximity to key amenities',
    'Strong public transport links',
  ];
  const rightPoints = [
    `High visibility for ${data.propertyType}`,
    `Demand from ${data.assetCategory} buyers`,
    'Established neighbourhood context',
    'Low competition in immediate vicinity',
  ];
  addTwoColumns(s1, 'Location Strengths', leftPoints, 'Market Context', rightPoints, 2.4);
  addFooter(s1, pageStart + 1, totalPages);

  const s2 = pptx.addSlide();
  slide_whiteBg(s2);
  addNavyHeader(s2, '3. Site Assessment', 'Site Characteristics');
  const charItems = [
    `Land area and development potential for ${data.numberOfUnits} ${data.propertyType} units`,
    'Existing infrastructure and utilities in place',
    `Surrounding land uses compatible with ${data.priceRange} ${data.propertyType}`,
    'Regulatory and zoning considerations reviewed',
    'No major site constraints identified',
  ];
  s2.addText(
    charItems.map(t => ({ text: t, options: { bullet: { type: 'bullet' }, breakLine: true, paraSpaceAfter: 10 } })),
    { x: 0.5, y: 1.4, w: 9, h: 5.5, fontSize: 13, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
  );
  addFooter(s2, pageStart + 2, totalPages);
}

function buildMarketOverview(pptx, data, pageStart, totalPages) {
  addSectionDivider(pptx, '4.', 'Market Overview');

  const s1 = pptx.addSlide();
  slide_whiteBg(s1);
  addNavyHeader(s1, '4. Market Overview', `Market Overview: ${data.city} ${data.propertyType}`);
  s1.addText(
    `Analysis of the ${data.propertyType} market in ${data.city}. ` +
    `The ${data.assetCategory} segment at ${data.priceRange} shows favorable absorption and pricing trends.`,
    { x: 0.4, y: 1.35, w: 9.2, h: 0.9, fontSize: 13, color: DGRAY, fontFace: FONT_BODY }
  );
  const stats = [
    { label: 'Market Segment', value: data.assetCategory },
    { label: 'Price Positioning', value: data.priceRange },
    { label: 'Asset Type', value: data.propertyType },
    { label: 'Target City', value: data.city },
  ];
  stats.forEach((s, i) => {
    const x = 0.4 + i * 2.32;
    s1.addShape('rect', { x, y: 2.45, w: 2.1, h: 1.1, fill: { color: LGRAY }, line: { color: 'DDDDDD', width: 0.5 } });
    s1.addShape('rect', { x, y: 2.45, w: 2.1, h: 0.1, fill: { color: GOLD }, line: { color: GOLD } });
    s1.addText(s.value, { x, y: 2.6, w: 2.1, h: 0.55, fontSize: 14, color: NAVY, fontFace: FONT_TITLE, align: 'center', bold: true });
    s1.addText(s.label, { x, y: 3.1, w: 2.1, h: 0.4, fontSize: 9, color: DGRAY, fontFace: FONT_BODY, align: 'center' });
  });
  addFooter(s1, pageStart + 1, totalPages);

  const s2 = pptx.addSlide();
  slide_whiteBg(s2);
  addNavyHeader(s2, '4. Market Overview', 'Demand Drivers');
  const demandItems = [
    `Population growth and demographic trends driving ${data.propertyType} demand in ${data.city}`,
    `Economic indicators and purchasing power supporting ${data.priceRange} segment`,
    `Market absorption for ${data.propertyType} in ${data.city} remains strong`,
    'Competitive landscape and differentiation opportunity identified',
    `${data.assetCategory} buyers showing increasing interest in this micro-market`,
  ];
  s2.addText(
    demandItems.map(t => ({ text: t, options: { bullet: { type: 'bullet' }, breakLine: true, paraSpaceAfter: 10 } })),
    { x: 0.5, y: 1.4, w: 9, h: 5.5, fontSize: 13, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
  );
  addFooter(s2, pageStart + 2, totalPages);
}

function buildDevRecommendations(pptx, data, pageStart, totalPages) {
  addSectionDivider(pptx, '5.', 'Development Recommendations');

  const s1 = pptx.addSlide();
  slide_whiteBg(s1);
  addNavyHeader(s1, '5. Development Recommendations', 'Recommended Use & Mix');
  s1.addText(
    `Based on market analysis, the recommended development of ${data.numberOfUnits} ${data.propertyType} units ` +
    `in ${data.city} aligns with demand drivers and optimizes land use.`,
    { x: 0.4, y: 1.35, w: 9.2, h: 0.8, fontSize: 13, color: DGRAY, fontFace: FONT_BODY }
  );
  addFooter(s1, pageStart + 1, totalPages);

  const s2 = pptx.addSlide();
  slide_whiteBg(s2);
  addNavyHeader(s2, '5. Development Recommendations', 'Development Parameters');
  const paramItems = [
    `Gross floor area for ${data.numberOfUnits} ${data.propertyType} units`,
    `Unit mix aligned with ${data.priceRange} segment in ${data.city}`,
    'Common areas and amenities as per market standard',
    'Phasing and delivery strategy: 3 phases over 36 months',
    `Design and specification targeting ${data.assetCategory} buyers`,
  ];
  s2.addText(
    paramItems.map(t => ({ text: t, options: { bullet: { type: 'bullet' }, breakLine: true, paraSpaceAfter: 10 } })),
    { x: 0.5, y: 1.4, w: 9, h: 5.5, fontSize: 13, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
  );
  addFooter(s2, pageStart + 2, totalPages);

  const s3 = pptx.addSlide();
  slide_whiteBg(s3);
  addNavyHeader(s3, '5. Development Recommendations', 'Implementation Roadmap');
  const phases = [
    { phase: 'Phase 1', period: 'Months 1–6', desc: 'Design, approvals & site preparation' },
    { phase: 'Phase 2', period: 'Months 7–24', desc: 'Construction & marketing launch' },
    { phase: 'Phase 3', period: 'Months 25–36', desc: 'Handover, sales completion & close-out' },
  ];
  phases.forEach((p, i) => {
    const y = 1.5 + i * 1.55;
    s3.addShape('rect', { x: 0.4, y, w: 1.5, h: 1.3, fill: { color: NAVY }, line: { color: NAVY } });
    s3.addText(p.phase, { x: 0.4, y: y + 0.15, w: 1.5, h: 0.5, fontSize: 14, color: GOLD, fontFace: FONT_TITLE, align: 'center' });
    s3.addText(p.period, { x: 0.4, y: y + 0.65, w: 1.5, h: 0.4, fontSize: 9, color: WHITE, fontFace: FONT_BODY, align: 'center' });
    s3.addShape('rect', { x: 2.1, y: y + 0.05, w: 7.4, h: 1.2, fill: { color: LGRAY }, line: { color: 'DDDDDD', width: 0.5 } });
    s3.addText(p.desc, { x: 2.3, y: y + 0.25, w: 7.0, h: 0.8, fontSize: 13, color: DGRAY, fontFace: FONT_BODY, valign: 'middle' });
  });
  addFooter(s3, pageStart + 3, totalPages);
}

function buildFinancial(pptx, data, pageStart, totalPages) {
  addSectionDivider(pptx, '6.', 'Financial & Investment Analysis');

  const s1 = pptx.addSlide();
  slide_whiteBg(s1);
  addNavyHeader(s1, '6. Financial & Investment Analysis', 'Investment Summary');
  s1.addText(
    `Financial projections for ${data.numberOfUnits} ${data.propertyType} units in ${data.city} ` +
    `at ${data.priceRange} positioning indicate a viable investment case.`,
    { x: 0.4, y: 1.35, w: 9.2, h: 0.8, fontSize: 13, color: DGRAY, fontFace: FONT_BODY }
  );
  const fins = [
    { label: 'Est. Total Revenue', value: data.totalRevenue },
    { label: 'Est. Dev. Cost', value: data.devCost },
    { label: 'Target IRR', value: data.targetIRR },
    { label: 'Payback Period', value: data.paybackPeriod },
  ];
  fins.forEach((f, i) => {
    const x = 0.4 + i * 2.32;
    s1.addShape('rect', { x, y: 2.4, w: 2.1, h: 1.4, fill: { color: NAVY }, line: { color: NAVY } });
    s1.addShape('rect', { x, y: 2.4, w: 2.1, h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
    s1.addText(f.value, { x, y: 2.55, w: 2.1, h: 0.7, fontSize: 18, color: GOLD, fontFace: FONT_TITLE, align: 'center', valign: 'middle' });
    s1.addText(f.label, { x, y: 3.2, w: 2.1, h: 0.55, fontSize: 9, color: WHITE, fontFace: FONT_BODY, align: 'center', valign: 'middle' });
  });
  addFooter(s1, pageStart + 1, totalPages);

  const s2 = pptx.addSlide();
  slide_whiteBg(s2);
  addNavyHeader(s2, '6. Financial & Investment Analysis', 'Key Assumptions');
  const assumItems = [
    `Land cost and development expenditure based on current ${data.city} market rates`,
    `Sales/rental price assumptions for ${data.priceRange} ${data.propertyType}`,
    'Construction timeline: 18–24 months for main build phase',
    `Financing structure: equity + debt aligned with ${data.assetCategory} norms`,
    'Absorption rate: 15–20 units per month based on comparable projects',
  ];
  s2.addText(
    assumItems.map(t => ({ text: t, options: { bullet: { type: 'bullet' }, breakLine: true, paraSpaceAfter: 10 } })),
    { x: 0.5, y: 1.4, w: 9, h: 5.5, fontSize: 13, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
  );
  addFooter(s2, pageStart + 2, totalPages);

  const s3 = pptx.addSlide();
  slide_whiteBg(s3);
  addNavyHeader(s3, '6. Financial & Investment Analysis', 'Returns & Sensitivity');
  const retItems = [
    `IRR and equity multiple projections under base, upside and downside scenarios`,
    `Sensitivity to price variation: ±10% impact on ${data.priceRange} ${data.propertyType}`,
    `Break-even analysis: units sold to cover total development cost`,
    'Exit strategy: bulk sale vs. retail off-plan vs. strata sale considerations',
  ];
  s3.addText(
    retItems.map(t => ({ text: t, options: { bullet: { type: 'bullet' }, breakLine: true, paraSpaceAfter: 10 } })),
    { x: 0.5, y: 1.4, w: 9, h: 5.5, fontSize: 13, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
  );
  addFooter(s3, pageStart + 3, totalPages);
}

function buildDisclaimer(pptx, totalPages) {
  addSectionDivider(pptx, '', 'Disclaimer');

  const slide = pptx.addSlide();
  slide_whiteBg(slide);
  addNavyHeader(slide, 'DISCLAIMER', 'Disclaimer');
  slide.addText(
    'This presentation is prepared for informational purposes only. The analysis is based on assumptions and ' +
    'data available at the time of preparation. Actual results may vary. This document does not constitute ' +
    'professional advice. Recipients should seek independent professional advice before making any investment ' +
    'or development decision. The information contained herein is confidential and intended solely for the ' +
    'named recipient.',
    { x: 0.5, y: 1.4, w: 9, h: 3, fontSize: 12, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
  );
  addFooter(slide, totalPages, totalPages);
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — generatePptxFromForm(formData)
// ══════════════════════════════════════════════════════════════════════════════

function getLibraryPath(typeName = 'Feasibility Study') {
  const candidates = [
    path.join(backendRoot, 'Library', typeName),
    path.join(process.cwd(), 'Library', typeName),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function generatePptxFromForm(formData) {
  // ── 0. Try Library assembly first (rich varying sections from pre-made PPTX) ──
  const libPath = getLibraryPath('Feasibility Study');
  const coverPath = libPath && path.join(libPath, '01_Cover Page', 'cover.pptx');
  if (libPath && coverPath && fs.existsSync(coverPath)) {
    try {
      const { assemblePresentationAutomizer } = await import('./presentationServiceAutomizer.js');
      const presentationType = { name: 'Feasibility Study', sections: FEASIBILITY_SECTIONS };
      const plots = [{ criteria: formDataToCriteria(formData), data: formData }];
      const enhancedFormData = {
        title: formData.projectTitle || formData.title || formData.project_name || 'Feasibility Study',
        projectTitle: formData.projectTitle || formData.title || formData.project_name,
        clientName: formData.clientName || formData.client_name || formData.client,
        date: formData.date,
        city: formData.city || formData.City,
        propertyType: formData.propertyType || formData.property_type,
        assetCategory: formData.assetCategory || formData.asset_category,
        numberOfUnits: formData.numberOfUnits ?? formData.number_of_units ?? formData.units,
        priceRange: formData.priceRange || formData.price_range,
        totalRevenue: formData.totalRevenue || formData.total_revenue,
        devCost: formData.devCost || formData.dev_cost,
        targetIRR: formData.targetIRR || formData.target_irr,
        paybackPeriod: formData.paybackPeriod || formData.payback_period,
        ...formData,
      };
      const result = await assemblePresentationAutomizer({
        presentationType,
        formData: enhancedFormData,
        plots,
        userId: '000000000000000000000000',
      });
      console.log(`[generatePptxFromForm] ✅ Used Library assembly: ${result.fileName}`);
      return { fileName: result.fileName, filePath: result.filePath };
    } catch (err) {
      console.warn('[generatePptxFromForm] Library assembly failed, falling back to pptxgenjs:', err.message);
    }
  }

  // ── 1. Normalize all form fields (handles numberOfUnits, number_of_units, units, etc.) ──
  const data = {
    projectTitle: formData.projectTitle || formData.title || formData.project_name || 'Feasibility Study',
    clientName: formData.clientName || formData.client_name || formData.client || 'Confidential',
    city: formData.city || formData.City || 'N/A',
    propertyType: formData.propertyType || formData.property_type || formData.assetType || 'N/A',
    assetCategory: formData.assetCategory || formData.asset_category || formData.category || 'Residential',
    numberOfUnits: formData.numberOfUnits ?? formData.number_of_units ?? formData.units ?? 'TBD',
    priceRange: formData.priceRange || formData.price_range || formData.specs || 'N/A',
    date: formatDate(formData.date),
    totalRevenue: formData.totalRevenue || formData.total_revenue || 'TBD',
    devCost: formData.devCost || formData.dev_cost || 'TBD',
    targetIRR: formData.targetIRR || formData.target_irr || 'TBD',
    paybackPeriod: formData.paybackPeriod || formData.payback_period || 'TBD',
  };

  console.log('\n[generatePptxFromForm] Normalized data:', data);

  const includeExecutiveSummary = true;
  const includeSiteAssessment = true;
  const includeMarketOverview = !!data.city && data.city !== 'N/A';
  const includeDevRecommendations = !!data.propertyType && data.propertyType !== 'N/A';
  const includeFinancial = true;

  const sections = ['Project Background'];
  if (includeExecutiveSummary) sections.push('Executive Summary');
  if (includeSiteAssessment) sections.push('Site Assessment');
  if (includeMarketOverview) sections.push('Market Overview');
  if (includeDevRecommendations) sections.push('Development Recommendations');
  if (includeFinancial) sections.push('Financial & Investment Analysis');
  sections.push('Disclaimer');

  let totalPages = 3;
  totalPages += 3;
  if (includeExecutiveSummary) totalPages += 3;
  if (includeSiteAssessment) totalPages += 3;
  if (includeMarketOverview) totalPages += 3;
  if (includeDevRecommendations) totalPages += 4;
  if (includeFinancial) totalPages += 4;
  totalPages += 2;

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Smart Presentation Solutions';
  pptx.company = data.clientName;
  pptx.subject = data.projectTitle;
  pptx.title = data.projectTitle;

  let currentPage = 1;

  buildCoverSlide(pptx, data);
  currentPage++;
  buildTocDivider(pptx);
  currentPage++;
  buildTocContent(pptx, sections, totalPages);
  currentPage++;
  buildProjectBackground(pptx, data, currentPage, totalPages);
  currentPage += 3;

  if (includeExecutiveSummary) {
    buildExecutiveSummary(pptx, data, currentPage, totalPages);
    currentPage += 3;
  }
  if (includeSiteAssessment) {
    buildSiteAssessment(pptx, data, currentPage, totalPages);
    currentPage += 3;
  }
  if (includeMarketOverview) {
    buildMarketOverview(pptx, data, currentPage, totalPages);
    currentPage += 3;
  }
  if (includeDevRecommendations) {
    buildDevRecommendations(pptx, data, currentPage, totalPages);
    currentPage += 4;
  }
  if (includeFinancial) {
    buildFinancial(pptx, data, currentPage, totalPages);
    currentPage += 4;
  }

  buildDisclaimer(pptx, totalPages);

  const outputDir = path.join(backendRoot, 'generated');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const safeTitle = data.projectTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  const fileName = `${safeTitle}_${uuidv4().substring(0, 8)}.pptx`;
  const filePath = path.join(outputDir, fileName);

  await pptx.writeFile({ fileName: filePath });

  console.log(`[generatePptxFromForm] ✅ Generated: ${fileName}`);
  return { fileName, filePath };
}

export default generatePptxFromForm;
