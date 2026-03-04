/**
 * Populates the Library with professionally designed PPTX files.
 * Design: Navy #234874 + Gold #E2A300, Century Schoolbook font, gold accent bars,
 * header layout, footer with copyright, section divider slides.
 *
 * Run: npm run populate  (from backend folder)
 *
 * Optional: Add images to Library/assets/ for full-bleed backgrounds:
 *   - cover-bg.jpg    → Cover slide background
 *   - section-bg.jpg  → Section divider backgrounds
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import PptxGenJS from 'pptxgenjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname);
const libRoot = path.join(backendRoot, 'Library');
const libFs = path.join(libRoot, 'Feasibility Study');
const assetsDir = path.join(libRoot, 'assets');

// Design constants
const NAVY = '234874';
const GOLD = 'E2A300';
const FONT = 'Century Schoolbook';
const FOOTER = '© Smart Presentation Machine';

function getSlideMaster(pres) {
  pres.defineSlideMaster({
    title: 'CONTENT_SLIDE',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: NAVY } } },
      { rect: { x: 0, y: 1.2, w: '100%', h: 0.08, fill: { color: GOLD } } },
      {
        placeholder: {
          options: { name: 'header', type: 'title', x: 0.5, y: 0.2, w: 12, h: 0.8, align: 'left', fontFace: FONT, fontSize: 28, color: 'FFFFFF', bold: true }
        },
        text: 'Section Title'
      },
      { text: { text: FOOTER, options: { x: 0.5, y: 7.2, w: 12, h: 0.3, align: 'center', fontFace: FONT, fontSize: 10, color: '666666' } } }
    ]
  });
}

function addContentSlide(pres, title, body, bullets = []) {
  const slide = pres.addSlide({ masterName: 'CONTENT_SLIDE' });
  slide.addText(title, { placeholder: 'header' });
  const yStart = 1.5;
  if (body) {
    slide.addText(body, { x: 0.5, y: yStart, w: 12, h: 2, fontFace: FONT, fontSize: 14, color: '333333', align: 'left', valign: 'top' });
  }
  if (bullets.length) {
    const bulletText = bullets.map(b => `• ${b}`).join('\n');
    slide.addText(bulletText, { x: 0.5, y: body ? yStart + 3 : yStart, w: 12, h: 4, fontFace: FONT, fontSize: 14, color: '333333', align: 'left', valign: 'top' });
  }
  return slide;
}

function addSectionDivider(pres, title) {
  const slide = pres.addSlide();
  const bgPath = path.join(assetsDir, 'section-bg.jpg');
  const bgPathPng = path.join(assetsDir, 'section-bg.png');
  if (fs.existsSync(bgPath) || fs.existsSync(bgPathPng)) {
    const imgPath = fs.existsSync(bgPath) ? bgPath : bgPathPng;
    slide.background = { path: imgPath };
    slide.addShape({ shape: 'rect', x: 0, y: 0, w: '100%', h: '100%', fill: { color: NAVY, transparency: 25 } });
  } else {
    slide.background = { color: NAVY };
  }
  slide.addText(title, {
    x: 0.5, y: 2.2, w: 9, h: 1.5,
    fontFace: FONT, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center'
  });
  slide.addShape({ shape: 'rect', x: 0.5, y: 3.9, w: 9, h: 0.06, fill: { color: GOLD } });
  return slide;
}

function createCoverPptx() {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';

  // Minimal master — we build the cover manually for full control over image + overlay
  ppt.defineSlideMaster({
    title: 'COVER_SLIDE',
    background: { color: NAVY },
    objects: []
  });

  const slide = ppt.addSlide({ masterName: 'COVER_SLIDE' });

  // STEP 1: Full background IMAGE (city skyline) — check multiple locations
  const coverPaths = [
    path.join(assetsDir, 'cover-bg.jpg'),
    path.join(assetsDir, 'cover-bg.png'),
    path.join(backendRoot, 'public', 'images', 'cover_bg.jpg'),
    path.join(backendRoot, 'public', 'images', 'cover_bg.png'),
  ];
  const bgImagePath = coverPaths.find(p => fs.existsSync(p));

  if (bgImagePath) {
    slide.addImage({
      path: bgImagePath,
      x: 0, y: 0, w: 10, h: 5.63,
    });
  } else {
    slide.addShape({ shape: 'rect', x: 0, y: 0, w: 10, h: 5.63, fill: { color: NAVY }, line: { color: NAVY } });
  }

  // STEP 2: Dark navy overlay on BOTTOM HALF only (photo shows on top)
  slide.addShape({
    shape: 'rect',
    x: 0, y: 2.8, w: 10, h: 2.83,
    fill: { color: NAVY, transparency: 15 },
    line: { color: NAVY },
  });

  // STEP 3: Gold accent line above text area
  slide.addShape({ shape: 'rect', x: 0, y: 2.75, w: 10, h: 0.06, fill: { color: GOLD }, line: { color: GOLD } });

  // Text content (placeholders replaced by token replacement)
  slide.addText('REAL ESTATE', { x: 0.5, y: 3.0, w: 6, h: 0.35, fontSize: 11, color: GOLD, fontFace: FONT, charSpacing: 4 });
  slide.addText('FEASIBILITY STUDY', { x: 0.5, y: 3.35, w: 6, h: 0.45, fontSize: 16, color: 'FFFFFF', fontFace: FONT, charSpacing: 2 });
  slide.addText('{{CITY}}', { x: 0.5, y: 3.8, w: 6, h: 0.35, fontSize: 11, color: GOLD, fontFace: FONT, charSpacing: 3 });
  slide.addText('{{PROJECT_NAME}}', { x: 0.5, y: 4.2, w: 8, h: 0.9, fontSize: 26, color: 'FFFFFF', fontFace: FONT, bold: false, valign: 'middle' });
  slide.addShape({ shape: 'rect', x: 0.5, y: 5.1, w: 3.5, h: 0.05, fill: { color: GOLD }, line: { color: GOLD } });
  slide.addText('{{CLIENT_NAME}} | {{DATE}}', { x: 0.5, y: 5.25, w: 6, h: 0.3, fontSize: 10, color: 'CCCCCC', fontFace: FONT });

  // Bottom bar
  slide.addShape({ shape: 'rect', x: 0, y: 5.4, w: 10, h: 0.23, fill: { color: GOLD }, line: { color: GOLD } });
  slide.addText('CORPORATE PRESENTATION', { x: 0, y: 5.42, w: 10, h: 0.2, fontSize: 8, color: NAVY, fontFace: FONT, align: 'center', bold: true });

  return ppt;
}

function createTocPptx() {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';
  getSlideMaster(ppt);

  addSectionDivider(ppt, 'Table of Contents');
  addContentSlide(ppt, 'Table of Contents', null, [
    '1. Project Background',
    '2. Executive Summary',
    '3. Site Assessment',
    '4. Market Overview',
    '5. Development Recommendations Part 1',
    '6. Development Recommendations Part 2',
    '7. Development Recommendations Part 3',
    '8. Financial & Investment Analysis',
    '9. Disclaimer'
  ]);
  return ppt;
}

function createProjectBackgroundPptx() {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';
  getSlideMaster(ppt);

  addSectionDivider(ppt, 'Project Background');
  addContentSlide(ppt, 'Project Overview', 'This feasibility study covers the {{PROPERTY_TYPE}} market in {{CITY}}. The project targets the {{ASSET_CATEGORY}} segment with {{NUMBER_OF_UNITS}} units at {{PRICE_RANGE}} positioning.');
  addContentSlide(ppt, 'Project Scope', null, [
    'Location: {{CITY}}',
    'Property Type: {{PROPERTY_TYPE}}',
    'Asset Category: {{ASSET_CATEGORY}}',
    'Number of Units: {{NUMBER_OF_UNITS}}',
    'Price Range: {{PRICE_RANGE}}',
    'Client: {{CLIENT_NAME}}'
  ]);
  return ppt;
}

function createExecutiveSummaryPptx() {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';
  getSlideMaster(ppt);

  addSectionDivider(ppt, 'Executive Summary');
  addContentSlide(ppt, 'Key Findings', 'The {{CITY}} market for {{PROPERTY_TYPE}} in the {{ASSET_CATEGORY}} segment shows strong potential. With {{NUMBER_OF_UNITS}} units targeting {{PRICE_RANGE}}, the project aligns with current demand drivers.');
  addContentSlide(ppt, 'Recommendations', null, [
    'Proceed with development based on market alignment',
    'Consider phased approach for risk mitigation',
    'Monitor key market indicators during implementation'
  ]);
  return ppt;
}

function createSiteAssessmentPptx() {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';
  getSlideMaster(ppt);

  addSectionDivider(ppt, 'Site Assessment');
  addContentSlide(ppt, 'Site Location & Context', 'The proposed site in {{CITY}} benefits from strong connectivity and visibility. The {{PROPERTY_TYPE}} development will leverage the city infrastructure and {{ASSET_CATEGORY}} demand profile.');
  addContentSlide(ppt, 'Site Characteristics', null, [
    'Land area and development potential',
    'Existing infrastructure and utilities',
    'Surrounding land uses and compatibility',
    'Regulatory and zoning considerations'
  ]);
  return ppt;
}

function createMarketOverviewPptx(key) {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';
  getSlideMaster(ppt);

  const label = key.replace(/_/g, ' ');
  addSectionDivider(ppt, 'Market Overview');
  addContentSlide(ppt, `Market Overview: ${label}`, `Analysis of the ${label} market segment. Demand drivers, supply dynamics, and pricing trends support the feasibility of the proposed development.`);
  addContentSlide(ppt, 'Demand Drivers', null, [
    'Population growth and demographic trends',
    'Economic indicators and purchasing power',
    'Market absorption and vacancy rates',
    'Competitive landscape and differentiation'
  ]);
  addContentSlide(ppt, 'Supply & Pricing', null, [
    'Existing and pipeline supply in the segment',
    'Pricing benchmarks and achievable rates',
    'Rental vs. sales market dynamics',
    'Premium positioning opportunities'
  ]);
  return ppt;
}

/** Development Recommendations Part 2 — VARYING content (distinct from Market Overview) */
function createDevRecPart2Pptx(key) {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';
  getSlideMaster(ppt);

  const label = key.replace(/_/g, ' ');
  addSectionDivider(ppt, 'Development Recommendations Part 2');
  addContentSlide(ppt, `Recommended Mix: ${label}`, `Development parameters for the ${label} segment. Unit mix, GFA allocation, and phasing tailored to this specific market.`);
  addContentSlide(ppt, 'Unit Mix & Typology', null, [
    'Typology distribution aligned with target segment',
    'Unit sizes and configurations for the market',
    'Premium vs. standard mix optimization',
    'Amenity package and common area allocation'
  ]);
  addContentSlide(ppt, 'Phasing & Delivery', null, [
    'Construction phasing and handover schedule',
    'Sales launch timing and absorption assumptions',
    'Risk mitigation and contingency planning',
    'Key milestones and critical path'
  ]);
  return ppt;
}

function createDevRecPart1Pptx() {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';
  getSlideMaster(ppt);

  addSectionDivider(ppt, 'Development Recommendations Part 1');
  addContentSlide(ppt, 'Recommended Use & Mix', 'Based on market analysis, the recommended development of {{NUMBER_OF_UNITS}} {{PROPERTY_TYPE}} units in {{CITY}} aligns with demand drivers and optimizes land use. Target segment: {{PRICE_RANGE}}.');
  addContentSlide(ppt, 'Development Parameters', null, [
    'Gross floor area and plot ratio',
    'Unit mix and typology distribution',
    'Common areas and amenities',
    'Phasing and delivery strategy'
  ]);
  return ppt;
}

function createDevRecPart3Pptx() {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';
  getSlideMaster(ppt);

  addSectionDivider(ppt, 'Development Recommendations Part 3');
  addContentSlide(ppt, 'Implementation Roadmap', 'Key milestones and critical path for project delivery. Risk mitigation and contingency planning are integrated into the timeline.');
  addContentSlide(ppt, 'Next Steps', null, [
    'Finalize design and approvals',
    'Secure financing and partnerships',
    'Launch marketing and pre-sales',
    'Commence construction'
  ]);
  return ppt;
}

function createFinancialPptx() {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';
  getSlideMaster(ppt);

  addSectionDivider(ppt, 'Financial & Investment Analysis');
  addContentSlide(ppt, 'Investment Summary', 'Financial projections for {{NUMBER_OF_UNITS}} {{PROPERTY_TYPE}} units in {{CITY}} at {{PRICE_RANGE}} indicate a viable investment case. Est. Total Revenue: {{TOTAL_REVENUE}} | Dev. Cost: {{DEV_COST}} | Target IRR: {{TARGET_IRR}} | Payback: {{PAYBACK_PERIOD}}');
  addContentSlide(ppt, 'Key Assumptions', null, [
    'Land cost and development expenditure',
    'Sales/rental price assumptions',
    'Construction timeline and phasing',
    'Financing structure and costs'
  ]);
  addContentSlide(ppt, 'Returns & Sensitivity', null, [
    'IRR and equity multiple projections',
    'Sensitivity to price and cost variations',
    'Break-even analysis',
    'Exit strategy considerations'
  ]);
  return ppt;
}

function createDisclaimerPptx() {
  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'CUSTOM', width: 10, height: 5.63 });
  ppt.layout = 'CUSTOM';
  getSlideMaster(ppt);

  addContentSlide(ppt, 'Disclaimer', 'This presentation is prepared for informational purposes only. The analysis is based on assumptions and data available at the time of preparation. Actual results may vary. This document does not constitute professional advice. © Smart Presentation Machine.');
  return ppt;
}

const SECTIONS = [
  { folder: '01_Cover Page', filename: 'cover.pptx', create: createCoverPptx },
  { folder: '02_Table of Contents', filename: 'toc.pptx', create: createTocPptx },
  { folder: '03_Project Background', filename: 'project_background.pptx', create: createProjectBackgroundPptx },
  { folder: '04_Executive Summary', filename: 'executive_summary.pptx', create: createExecutiveSummaryPptx },
  { folder: '05_Site Assessment', filename: 'site_assessment.pptx', create: createSiteAssessmentPptx },
  { folder: '06_Market Overview', filename: null },
  { folder: '07_Development Recommendations Part 1', filename: 'devrec_part1.pptx', create: createDevRecPart1Pptx },
  { folder: '08_Development Recommendations Part 2', filename: null },
  { folder: '09_Development Recommendations Part 3', filename: 'devrec_part3.pptx', create: createDevRecPart3Pptx },
  { folder: '10_Financial & Investment Analysis', filename: 'financial_investment_analysis.pptx', create: createFinancialPptx },
  { folder: '11_Disclaimer', filename: 'disclaimer.pptx', create: createDisclaimerPptx },
];

const VARYING_KEYS = [
  'dubai_residential_apartments_luxury',
  'dubai_residential_luxury_apartments_2m_5m_aed',
  'dubai_residential_townhouses_2m_5m_aed',
  'abu_dhabi_residential_apartments_luxury',
  'riyadh_residential_villas_luxury',
  'jeddah_hotel_small_regional_mall_leisure',
];

async function main() {
  if (!fs.existsSync(libRoot)) fs.mkdirSync(libRoot, { recursive: true });
  if (!fs.existsSync(libFs)) fs.mkdirSync(libFs, { recursive: true });
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, 'README.txt'), 'Add cover-bg.jpg and section-bg.jpg here for full-bleed backgrounds on cover and section divider slides.');
  }

  for (const sec of SECTIONS) {
    const dir = path.join(libFs, sec.folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (sec.filename && sec.create) {
      const ppt = sec.create();
      const outPath = path.join(dir, sec.filename);
      await ppt.writeFile({ fileName: outPath });
      console.log('Created:', path.relative(backendRoot, outPath));
    }
  }

  const dir06 = path.join(libFs, '06_Market Overview');
  const dir08 = path.join(libFs, '08_Development Recommendations Part 2');
  for (const key of VARYING_KEYS) {
    const ppt06 = createMarketOverviewPptx(key);
    const out06 = path.join(dir06, `${key}.pptx`);
    await ppt06.writeFile({ fileName: out06 });
    console.log('Created:', path.relative(backendRoot, out06));

    const ppt08 = createDevRecPart2Pptx(key);
    const out08 = path.join(dir08, `${key}.pptx`);
    await ppt08.writeFile({ fileName: out08 });
    console.log('Created:', path.relative(backendRoot, out08));
  }

  console.log('\n✅ Library populated with navy #234874 + gold #E2A300 design.');
  console.log('   Add cover-bg.jpg and section-bg.jpg to Library/assets/ for custom backgrounds.');
  console.log('   Test: City=Dubai, Asset=Residential, Category=Apartments, Specs=Luxury');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
