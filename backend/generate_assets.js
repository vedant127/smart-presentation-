import pptxgen from "pptxgenjs";
import path from "path";
import fs from "fs";

// --- CONFIGURATION ---
const THEME = {
    navy: "1E2761",
    gold: "C4A862",
    white: "FFFFFF",
    font: "Calibri"
};

const FOOTER_TEXT = "© 2025 AIRE Software - All rights reserved.";

const baseLibrary = path.resolve(process.cwd(), "Library", "Feasibility Study");

// Ensure directory exists
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Helper to add footer to a slide
const addFooter = (slide) => {
    slide.addText(FOOTER_TEXT, {
        x: 0, y: "95%", w: "100%", align: "center",
        fontSize: 10, color: "888888", fontFace: THEME.font
    });
};

// --- FILE GENERATORS ---

/**
 * 01_Cover Page/cover.pptx
 */
const createCover = async () => {
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";

    const slide = pptx.addSlide();
    slide.background = { color: THEME.navy };

    slide.addText("FEASIBILITY STUDY", {
        x: 1, y: 2, w: "80%", align: "left",
        fontSize: 44, color: THEME.white, bold: true, fontFace: THEME.font
    });
    slide.addText("{{PROJECT_NAME}}", {
        x: 1, y: 3, w: "80%", align: "left",
        fontSize: 32, color: THEME.gold, fontFace: THEME.font
    });
    slide.addText("Prepared for: {{CLIENT_NAME}}", {
        x: 1, y: 5, w: "80%", align: "left",
        fontSize: 18, color: THEME.white, fontFace: THEME.font
    });
    slide.addText("Date: {{DATE}}", {
        x: 1, y: 5.5, w: "80%", align: "left",
        fontSize: 14, color: "CCCCCC", fontFace: THEME.font
    });

    addFooter(slide);

    const dir = path.join(baseLibrary, "01_Cover Page");
    ensureDir(dir);
    await pptx.writeFile({ fileName: path.join(dir, "cover.pptx") });
    console.log("✔ Generated cover.pptx");
};

/**
 * 02_Table of Contents/toc.pptx
 */
const createTOC = async () => {
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";

    const slide = pptx.addSlide();
    slide.addText("TABLE OF CONTENTS", {
        x: 1, y: 0.5, w: "80%", fontSize: 32, color: THEME.navy, bold: true, fontFace: THEME.font
    });

    const sections = [
        "01. Project Background",
        "02. Executive Summary",
        "03. Site Assessment",
        "04. Market Overview",
        "05. Development Recommendations",
        "06. Financial & Investment Analysis",
        "07. Disclaimer"
    ];

    sections.forEach((text, i) => {
        slide.addText(text, {
            x: 1.2, y: 1.5 + (i * 0.6), w: "70%",
            fontSize: 18, color: "333333", fontFace: THEME.font
        });
        slide.addText("....", {
            x: 5, y: 1.5 + (i * 0.6), w: "30%", align: "right",
            fontSize: 18, color: "999999"
        });
    });

    addFooter(slide);
    const dir = path.join(baseLibrary, "02_Table of Contents");
    ensureDir(dir);
    await pptx.writeFile({ fileName: path.join(dir, "toc.pptx") });
    console.log("✔ Generated toc.pptx");
};

/**
 * 03_Project Background/project_background.pptx
 */
const createBackground = async () => {
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";

    // Slide 1: Header
    const s1 = pptx.addSlide();
    s1.background = { color: THEME.navy };
    s1.addText("PROJECT BACKGROUND", {
        x: 0, y: "40%", w: "100%", align: "center",
        fontSize: 48, color: THEME.white, bold: true, fontFace: THEME.font
    });
    addFooter(s1);

    // Slide 2: Content
    const s2 = pptx.addSlide();
    s2.addText("Project Overview", { x: 0.5, y: 0.3, w: "90%", fontSize: 24, color: THEME.navy, bold: true });
    s2.addText("[Location Map Placeholder]", { x: 0.5, y: 1, w: "45%", h: 3, align: "center", valign: "middle", fill: { color: "F1F1F1" }, border: { type: "dash", color: "CCCCCC" } });
    s2.addText("Project Description:\nThe proposed development is situated in a prime growth corridor, targeting high-density residential demand with premium amenities and sustainable design principles.", {
        x: 5.5, y: 1, w: "40%", fontSize: 14, color: "444444"
    });

    const rows = [
        [{ text: "Attribute", options: { fill: THEME.navy, color: THEME.white, bold: true } }, { text: "Details", options: { fill: THEME.navy, color: THEME.white, bold: true } }],
        ["Total Land Area", "45,000 sq. ft."],
        ["Proposed GFA", "120,000 sq. ft."],
        ["Zoning", "Mixed-Use / Residential"]
    ];
    s2.addTable(rows, { x: 5.5, y: 3, w: 4, rowH: 0.4, border: { color: "CCCCCC" }, fontSize: 11 });

    addFooter(s2);
    const dir = path.join(baseLibrary, "03_Project Background");
    ensureDir(dir);
    await pptx.writeFile({ fileName: path.join(dir, "project_background.pptx") });
    console.log("✔ Generated project_background.pptx");
};

/**
 * 04_Executive Summary/executive_summary.pptx
 */
const createExecSummary = async () => {
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";

    // Slide 1: Header
    const s1 = pptx.addSlide();
    s1.background = { color: THEME.navy };
    s1.addText("EXECUTIVE SUMMARY", { x: 0, y: "40%", w: "100%", align: "center", fontSize: 48, color: THEME.white, bold: true });
    addFooter(s1);

    // Slide 2: Outlook
    const s2 = pptx.addSlide();
    s2.addText("Market Outlook & Opportunities", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s2.addText("• Significant undersupply in the premium segment.\n• Favorable regulatory environment and investor incentives.\n• Strategic infrastructure connectivity driving long-term capital appreciation.", { x: 0.5, y: 1, w: "90%", fontSize: 18 });
    addFooter(s2);

    // Slide 3: Pricing Rationale
    const s3 = pptx.addSlide();
    s3.addText("Pricing Rationale", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    const pricingRows = [
        [{ text: "Criteria", options: { fill: THEME.gold, color: THEME.white } }, { text: "Rationale", options: { fill: THEME.gold, color: THEME.white } }, { text: "Level of Premium", options: { fill: THEME.gold, color: THEME.white } }],
        ["Location", "Prime waterfront proximity", "15% - 20%"],
        ["Product Mix", "First-of-its-kind smart homes", "10%"],
        ["Brand Value", "AIRE Software Platinum Tier", "5%"]
    ];
    s3.addTable(pricingRows, { x: 0.5, y: 1, w: 9, rowH: 0.5, border: { color: "CCCCCC" } });
    addFooter(s3);

    // Slide 4: Financial KPIs
    const s4 = pptx.addSlide();
    s4.addText("Financial Results Summary", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    const kpis = [
        { label: "Project IRR", val: "18.5%" },
        { label: "Equity Multiplier", val: "2.4x" },
        { label: "Net Present Value", val: "$42M" }
    ];
    kpis.forEach((k, i) => {
        s4.addText(k.label, { x: 0.5 + (i * 3.2), y: 1.5, w: 3, align: "center", fontSize: 14, color: "666666" });
        s4.addText(k.val, { x: 0.5 + (i * 3.2), y: 2, w: 3, align: "center", fontSize: 36, color: THEME.navy, bold: true });
    });
    addFooter(s4);

    const dir = path.join(baseLibrary, "04_Executive Summary");
    ensureDir(dir);
    await pptx.writeFile({ fileName: path.join(dir, "executive_summary.pptx") });
    console.log("✔ Generated executive_summary.pptx");
};

/**
 * 05_Site Assessment/site_assessment.pptx
 */
const createSiteAssessment = async () => {
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";

    const s1 = pptx.addSlide();
    s1.background = { color: THEME.navy };
    s1.addText("SITE ASSESSMENT", { x: 0, y: "40%", w: "100%", align: "center", fontSize: 48, color: THEME.white, bold: true });
    addFooter(s1);

    const s2 = pptx.addSlide();
    s2.addText("Location Analysis & SWOT", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s2.addText("[Location Map Reference]", { x: 0.5, y: 1, w: 4, h: 3, align: "center", valign: "middle", fill: { color: "F9F9F9" }, border: { color: "CCCCCC" } });

    const swot = [
        [{ text: "Strengths", options: { fill: "E1EEDD" } }, { text: "Weaknesses", options: { fill: "FCECEC" } }],
        ["High visibility, Easy access", "Limited parking expansion"],
        [{ text: "Opportunities", options: { fill: "DDE7F0" } }, { text: "Threats", options: { fill: "FFF4E0" } }],
        ["New metro station nearby", "Rising material costs"]
    ];
    s2.addTable(swot, { x: 5, y: 1, w: 4.5, rowH: 0.7, border: { color: "CCCCCC" }, fontSize: 10 });
    addFooter(s2);

    const dir = path.join(baseLibrary, "05_Site Assessment");
    ensureDir(dir);
    await pptx.writeFile({ fileName: path.join(dir, "site_assessment.pptx") });
    console.log("✔ Generated site_assessment.pptx");
};

/**
 * 10_Financial & Investment Analysis/financial and investment analysis.pptx
 */
const createFinancials = async () => {
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";

    // Slide 1: Header
    const s1 = pptx.addSlide();
    s1.background = { color: THEME.navy };
    s1.addText("4. FINANCIAL & INVESTMENT ANALYSIS", { x: 1, y: "40%", w: "80%", fontSize: 48, color: THEME.white, bold: true });
    addFooter(s1);

    // Slide 2-6: Assumptions
    for (let i = 2; i <= 6; i++) {
        const s = pptx.addSlide();
        s.addText(`Assumptions - Part ${i - 1}`, { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
        const rows = [
            [{ text: "Parameter", options: { fill: THEME.gold, color: THEME.white } }, { text: "Value", options: { fill: THEME.gold, color: THEME.white } }],
            ["Inflation Rate", "2.5% p.a."],
            ["Cost of Debt", "6.0% p.a."],
            ["Exit Cap Rate", "7.5%"]
        ];
        s.addTable(rows, { x: 1, y: 1.5, w: 8, rowH: 0.5, border: { color: "EEEEEE" } });
        addFooter(s);
    }

    // Slide 7: Results
    const s7 = pptx.addSlide();
    s7.addText("FINANCIAL RESULTS SUMMARY", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s7.addText("The project yields a Total Profit of $85M over a 10-year hold period.", { x: 0.5, y: 1, fontSize: 16 });
    addFooter(s7);

    // Slide 8: Cash Flow
    const s8 = pptx.addSlide();
    s8.addText("CASH FLOW STATEMENTS", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s8.addText("[Cash Flow Column Chart Placeholder]", { x: 0.5, y: 1, w: 9, h: 4, align: "center", fill: { color: "F5F5F5" } });
    addFooter(s8);

    // Slide 9: Return
    const s9 = pptx.addSlide();
    s9.addText("RETURN ANALYSIS", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s9.addText("Unlevered IRR: 14%\nLevered IRR: 21%", { x: 1, y: 1.5, fontSize: 22, color: THEME.gold, bold: true });
    addFooter(s9);

    // Slide 10: Sensitivity
    const s10 = pptx.addSlide();
    s10.addText("SENSITIVITY ANALYSIS", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s10.addText("Sensitivity Matrix (Price vs. Cost)", { x: 0.5, y: 1, fontSize: 14 });
    s10.addTable([["", "-10%", "Base", "+10%"], ["Price", "12%", "14%", "16%"]], { x: 0.5, y: 1.5, w: 7, rowH: 0.5, border: { color: "CCCCCC" } });
    addFooter(s10);

    const dir = path.join(baseLibrary, "10_Financial & Investment Analysis");
    ensureDir(dir);
    await pptx.writeFile({ fileName: path.join(dir, "financial and investment analysis.pptx") });
    console.log("✔ Generated financial and investment analysis.pptx");
};

/**
 * 11_Disclaimer/disclaimer.pptx
 */
const createDisclaimer = async () => {
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";

    const slide = pptx.addSlide();
    slide.addText("DISCLAIMER", { x: 0.5, y: 0.5, fontSize: 32, color: "CC0000", bold: true });
    slide.addText(
        "This feasibility study has been prepared by AIRE Software exclusively for informational purposes. The projections and data contained herein are based on market conditions as of the date of publication and are subject to change. AIRE Software makes no representation or warranty, express or implied, as to the accuracy or completeness of the information. Investors should conduct their own independent due diligence before making any commitment.",
        { x: 0.5, y: 1.5, w: 9, fontSize: 16, color: "444444", align: "justify" }
    );
    addFooter(slide);
    const dir = path.join(baseLibrary, "11_Disclaimer");
    ensureDir(dir);
    await pptx.writeFile({ fileName: path.join(dir, "disclaimer.pptx") });
    console.log("✔ Generated disclaimer.pptx");
};

/**
 * Varying Sections (06 & 08)
 */
const createVarying = async () => {
    const fileName = "dubai + residential + apartments + luxury.pptx";

    // 06 Market Overview
    const pptx6 = new pptxgen();
    pptx6.layout = "LAYOUT_WIDE";

    const s61 = pptx6.addSlide();
    s61.background = { color: THEME.navy };
    s61.addText("MARKET OVERVIEW", { x: 0, y: "40%", w: "100%", align: "center", fontSize: 48, color: "FFFFFF", bold: true });
    addFooter(s61);

    const s62 = pptx6.addSlide();
    s62.addText("RESIDENTIAL SUPPLY", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s62.addText("[Supply Chart Placeholder]", { x: 0.5, y: 1, w: 9, h: 4, fill: { color: "F9F9F9" } });
    addFooter(s62);

    const s63 = pptx6.addSlide();
    s63.addText("RESIDENTIAL DEMAND DRIVERS", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s63.addText("[Demand Drivers Analysis]", { x: 0.5, y: 1, w: 9, h: 4, fill: { color: "F9F9F9" } });
    addFooter(s63);

    const s64 = pptx6.addSlide();
    s64.addText("KEY MARKET INDICATORS", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    const indicators = ["Avg. Yield: 6.5%", "Vacancy: 8%", "Absorption: High"];
    indicators.forEach((text, i) => {
        s64.addText(text, { x: 0.5 + (i * 3), y: 2, w: 2.8, h: 1.5, align: "center", fontSize: 18, fill: { color: THEME.navy }, color: THEME.white });
    });
    addFooter(s64);

    const dir6 = path.join(baseLibrary, "06_Market Overview");
    ensureDir(dir6);
    await pptx6.writeFile({ fileName: path.join(dir6, fileName) });
    console.log(`✔ Generated ${fileName} in 06`);

    // 08 Dev Rec Part 2
    const pptx8 = new pptxgen();
    pptx8.layout = "LAYOUT_WIDE";

    const s81 = pptx8.addSlide();
    s81.background = { color: THEME.gold };
    s81.addText("DEVELOPMENT RECOMMENDATIONS", { x: 0, y: "40%", w: "100%", align: "center", fontSize: 48, color: THEME.navy, bold: true });
    addFooter(s81);

    const s82 = pptx8.addSlide();
    s82.addText("CONCEPT AND DEVELOPMENT VISION", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s82.addText("[Vision Image 1]", { x: 0.5, y: 1, w: 4.5, h: 3, fill: { color: "EEEEEE" } });
    s82.addText("[Vision Image 2]", { x: 5.2, y: 1, w: 4.5, h: 3, fill: { color: "EEEEEE" } });
    addFooter(s82);

    const s83 = pptx8.addSlide();
    s83.addText("MARKET COMPARABLES", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s83.addTable([["Project", "Price/sqft", "Amenities"], ["The Ritz", "$1,800", "Full"], ["Luxury Tower", " $1,650", "Partial"]], { x: 0.5, y: 1, w: 9, rowH: 0.5, border: { color: "999999" } });
    addFooter(s83);

    const s84 = pptx8.addSlide();
    s84.addText("DEVELOPMENT BRIEF", { x: 0.5, y: 0.3, fontSize: 24, color: THEME.navy, bold: true });
    s84.addTable([["Spec", "Recommendation"], ["Units", "240"], ["Finishing", "Ultra-Premium"]], { x: 3, y: 1.5, w: 4, rowH: 0.6, fontSize: 12 });
    addFooter(s84);

    const dir8 = path.join(baseLibrary, "08_Development Recommendations Part 2");
    ensureDir(dir8);
    await pptx8.writeFile({ fileName: path.join(dir8, fileName) });
    console.log(`✔ Generated ${fileName} in 08`);
};

/**
 * 07 & 09 Dev Rec Parts 1/3
 */
const createDevRecParts = async () => {
    // Part 1
    const p1 = new pptxgen();
    p1.layout = "LAYOUT_WIDE";
    const p1s1 = p1.addSlide();
    p1s1.background = { color: THEME.navy };
    p1s1.addText("DEVELOPMENT RECOMMENDATIONS - PART 1", { x: 0, y: "40%", w: "100%", align: "center", fontSize: 36, color: "FFFFFF" });
    addFooter(p1s1);
    const p1s2 = p1.addSlide();
    p1s2.addText("METHODOLOGY", { x: 0.5, y: 0.3, fontSize: 24, bold: true });
    p1s2.addText("[Process Flow Diagram: Research -> Analysis -> Recommendation]", { x: 1, y: 1.5, w: 8, h: 3, align: "center", fill: { color: "FDFDFD" }, border: { color: THEME.gold } });
    addFooter(p1s2);
    const dir7 = path.join(baseLibrary, "07_Development Recommendations Part 1");
    ensureDir(dir7);
    await p1.writeFile({ fileName: path.join(dir7, "development recommendations PART 1.pptx") });

    // Part 3
    const p3 = new pptxgen();
    p3.layout = "LAYOUT_WIDE";
    const p3s1 = p3.addSlide();
    p3s1.addText("SIZING RATIONALE", { x: 0.5, y: 0.3, fontSize: 24, bold: true });
    p3s1.addTable([["Product", "Recommended Size"], ["1BR", "850 sqft"], ["2BR", "1,200 sqft"]], { x: 1, y: 1.5, w: 8 });
    addFooter(p3s1);
    const p3s2 = p3.addSlide();
    p3s2.addText("PRICING RATIONALE", { x: 0.5, y: 0.3, fontSize: 24, bold: true });
    p3s2.addTable([["Strategy", "Benefit"], ["Premium Skimming", "Max Margins"], ["Tiered Entry", "Velocity"]], { x: 1, y: 1.5, w: 8 });
    addFooter(p3s2);
    const dir9 = path.join(baseLibrary, "09_Development Recommendations Part 3");
    ensureDir(dir9);
    await p3.writeFile({ fileName: path.join(dir9, "development recommendations PART 3.pptx") });
    console.log("✔ Generated DevRec Parts 1 & 3");
};

// --- RUN ALL ---
const run = async () => {
    console.log("🚀 Starting FELIX Library Generation...\n");
    await createCover();
    await createTOC();
    await createBackground();
    await createExecSummary();
    await createSiteAssessment();
    await createFinancials();
    await createDisclaimer();
    await createVarying();
    await createDevRecParts();
    console.log("\n✨ ALL FILES GENERATED IN THE LIBRARY FOLDERS!");
};

run().catch(console.error);
