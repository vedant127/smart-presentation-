import PptxGenJS from "pptxgenjs";
import fs from "fs";
import path from "path";

const baseLibrary = path.join(process.cwd(), "Library", "Feasibility Study");

async function generateFile(folder, filename, title, slidesContent) {
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'CUSTOM', width: 20, height: 11.25 });
    pptx.layout = 'CUSTOM';
    pptx.theme = { headFontFace: "Arial", bodyFontFace: "Arial" };

    for (const slideData of slidesContent) {
        let slide = pptx.addSlide();

        // Add Header
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: "1F4E79" } });
        slide.addText(slideData.title || title, {
            x: 0.5, y: 0.2, w: '90%', h: 0.6, fontSize: 28, color: "FFFFFF", bold: true
        });

        // Add Content
        if (slideData.bullets) {
            slide.addText(slideData.bullets.join("\n"), {
                x: 0.5, y: 1.3, w: '90%', h: 4.0, fontSize: 18, color: "333333", bullet: true, align: "left"
            });
        }
        if (slideData.text) {
            slide.addText(slideData.text, {
                x: 0.5, y: 1.3, w: '90%', h: 4.0, fontSize: 18, color: "333333", align: "left"
            });
        }
    }

    const folderPath = path.join(baseLibrary, folder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    const outPath = path.join(folderPath, filename);
    await pptx.writeFile({ fileName: outPath });
    console.log(`Generated: ${outPath}`);
}

async function main() {
    console.log("Generating missing files...");

    // 04_Executive Summary
    await generateFile("04_Executive Summary", "executive_summary.pptx", "Executive Summary", [
        {
            title: "Executive Summary - Overview",
            text: "This document provides a comprehensive feasibility study and development recommendation for the selected plot. It outlines the strategic rationale, financial viability, and specific development guidelines tailored to maximize ROI."
        },
        {
            title: "Key Highlights",
            bullets: [
                "Prime location with high growth potential",
                "Strong market demand for premium residential units",
                "Favorable financial projections with solid IRR",
                "Optimized unit mix focusing on modern living standards"
            ]
        }
    ]);

    // 05_Site Assessment
    await generateFile("05_Site Assessment", "site_assessment.pptx", "Site Assessment", [
        {
            title: "Site Location & Boundaries",
            text: "The site is located in a highly accessible area with proximate access to major highways and public transit. The plot dimensions allow for a flexible and expansive development footprint."
        },
        {
            title: "Environmental & Zoning Factors",
            bullets: [
                "Topography is largely flat, reducing excavation costs",
                "Zoning allows for high-rise residential or mixed-use",
                "Existing utilities (water, power, sewage) are readily accessible at the boundary",
                "No major environmental constraints identified"
            ]
        }
    ]);

    // 06_Market Overview - Jeddah
    await generateFile("06_Market Overview", "jeddah + residential + apartments + luxury.pptx", "Market Overview: Jeddah Luxury Apartments", [
        {
            title: "Jeddah Real Estate Market Dynamics",
            bullets: [
                "Growing demand for luxury residential apartments driven by young demographics and modernization efforts",
                "Increase in expats and foreign professionals seeking premium living standards",
                "Government initiatives heavily supporting mega-projects and residential development"
            ]
        },
        {
            title: "Luxury Apartment Analytics",
            bullets: [
                "Average selling price for luxury apartments: 12,000 - 15,000 SAR per sqm",
                "Rental yields averaging 6-8% annually",
                "Target demographic: High Net Worth Individuals (HNWIs) and corporate executives"
            ]
        }
    ]);

    // 06_Market Overview - Dubai
    await generateFile("06_Market Overview", "dubai + residential + apartments + luxury.pptx", "Market Overview: Dubai Luxury Apartments", [
        {
            title: "Dubai Prime Real Estate Context",
            bullets: [
                "Dubai continues to be a global hub for luxury real estate investment",
                "Significant influx of HNWIs post-pandemic, driving up prime property values",
                "Golden Visa policies attracting long-term foreign investment"
            ]
        },
        {
            title: "Luxury Apartment Analytics",
            bullets: [
                "High demand in areas like Downtown Dubai, Palm Jumeirah, and Dubai Marina",
                "Prices for ultra-luxury units exceeding 3,000 AED per sqft",
                "Strong ROI and robust capital appreciation projected"
            ]
        }
    ]);

    // 06_Market Overview - Riyadh
    await generateFile("06_Market Overview", "riyadh + residential + small regional mall + business.pptx", "Market Overview: Riyadh Residential & Mall", [
        {
            title: "Riyadh Real Estate Market Dynamics",
            bullets: [
                "Strong economic growth driven by Vision 2030 initiatives and business expansion",
                "Increasing demand for mixed-use developments combining residential and retail",
                "Rapid population growth and urbanization fueling retail and housing sectors"
            ]
        }
    ]);

    // 07_Development Recommendations Part 1
    await generateFile("07_Development Recommendations Part 1", "devrec_part1.pptx", "Development Recommendations Part 1", [
        {
            title: "Proposed Concept & Vision",
            text: "The vision is to create a landmark luxury residential tower that embodies modern elegance, sustainability, and unparalleled amenities. The project will set a new benchmark for premium living in the area."
        },
        {
            title: "Target Audience & Positioning",
            bullets: [
                "Positioned as an ultra-premium lifestyle destination",
                "Targeting affluent families, successful professionals, and international investors",
                "Emphasis on privacy, security, and world-class concierge services"
            ]
        },
        {
            title: "Core Amenities & Features",
            bullets: [
                "Infinity pool with panoramic city views",
                "State-of-the-art fitness center and wellness spa",
                "Private cinema, business lounge, and kids play area",
                "Smart home technology integrated into all units"
            ]
        }
    ]);

    // 08_Development Recommendations Part 2 - Riyadh
    await generateFile("08_Development Recommendations Part 2", "riyadh + residential + small regional mall + business.pptx", "Development Recommendations Part 2: Riyadh", [
        {
            title: "Retail & Business Integration",
            bullets: [
                "Strategic placement of the small regional mall to maximize foot traffic",
                "Synergy between residential units and business/retail facilities",
                "Creating a self-sustaining community hub tailored for modern urban living"
            ]
        }
    ]);

    // 09_Development Recommendations Part 3 - Riyadh
    await generateFile("09_Development Recommendations Part 3", "riyadh + residential + small regional mall + business.pptx", "Development Recommendations Part 3: Riyadh", [
        {
            title: "Architectural & Design Guidelines",
            bullets: [
                "Contemporary design reflecting Riyadh's evolving skyline",
                "Sustainable building materials and energy-efficient systems",
                "Flexible commercial spaces designed for high visibility and accessibility"
            ]
        }
    ]);

    console.log("All files generated successfully.");
}

main().catch(console.error);
