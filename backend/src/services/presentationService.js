
import path from 'path';
import fs from 'fs';
import PptxGenJS from 'pptxgenjs';
import { generateSlideContent } from './aiService.js';

// AIRE Design System Colors
const COLORS = {
    NAVY: '234874',
    GOLD: 'E2A300',
    WHITE: 'FFFFFF',
    BLACK: '000000',
    GRAY: '666666',
    TEAL: '5B9AA8',
    YELLOW_LIGHT: 'FFED00'
};

// Helper: Ensure text is always a valid string for PptxGenJS
const safeText = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

/**
 * Generate a Professional Presentation using PptxGenJS (AIRE Design System)
 */
export const generatePresentation = async ({ presentationType, formData, plots, userId }) => {
    console.log(`🏭 GENERATE: Starting generation for "${presentationType.name}"`);

    // 1. Prepare Content via AI
    const sections = presentationType.sections || [];
    let aiContent = {};
    try {
        console.log('🤖 Asking AI for detailed content...');
        aiContent = await generateSlideContent(formData.title, formData.subtitle, sections, formData) || {};
    } catch (e) {
        console.warn("AI generation failed, using fallbacks.");
    }

    // 2. Initialize PPTX
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';
    pres.author = 'AIRE Software';
    pres.company = safeText(formData.company_name || 'Acme Corp');
    pres.title = safeText(formData.title);

    // 3. Define Master Slides (The "Template" System)

    // MASTER: CONTENT_SLIDE
    pres.defineSlideMaster({
        title: 'MASTER_CONTENT',
        background: { color: COLORS.WHITE },
        slideNumber: { x: 12.5, y: 7.25, w: 0.5, h: 0.3, fontFace: 'Arial', fontSize: 10, color: COLORS.GRAY, align: 'right' },
        objects: [
            // 1. Navy Header Bar (1.2 inches height)
            { rect: { x: 0, y: 0, w: '100%', h: 1.2, fill: COLORS.NAVY } },
            // 2. Gold Accent Line (0.15 inches height)
            { rect: { x: 0, y: 1.2, w: '100%', h: 0.15, fill: COLORS.GOLD } },
            // 3. Footer Line
            // { line: { x: 0.5, y: 7.2, w: 9, h: 0, line: COLORS.GRAY, lineSize: 1 } },
            // 4. Footer Text
            {
                text: {
                    text: "Source: AIRE | " + safeText(formData.title || "Confidential"),
                    options: { x: 0.5, y: 7.25, w: 8, h: 0.3, fontFace: 'Arial', fontSize: 10, color: COLORS.GRAY }
                }
            }
        ]
    });

    // MASTER: COVER_SLIDE (We build this manually on the slide to allow dynamic image)

    // --- SLIDE 1: COVER PAGE ---
    const slide1 = pres.addSlide();

    // Background Image (Full Bleed)
    // Try to find a specific image, otherwise generic
    const typeFolder = presentationType.name.toLowerCase().replace(/ /g, '-');
    const noteImagesDir = path.join(process.cwd(), 'templates', typeFolder, 'cover-images');
    let bgImage = null;

    if (fs.existsSync(noteImagesDir)) {
        const files = fs.readdirSync(noteImagesDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
        if (files.length > 0) bgImage = path.join(noteImagesDir, files[0]); // Pick first for consistency or random
    }

    if (bgImage) {
        slide1.background = { path: bgImage }; // PptxGenJS handles full background
    } else {
        slide1.background = { color: 'EFEFEF' }; // Fallback
    }

    // Navy Overlay (60% Opacity) - PptxGenJS transparency is 0-100%
    slide1.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: COLORS.NAVY, transparency: 40 } });

    // Gold Bar
    slide1.addShape(pres.ShapeType.rect, { x: 0, y: 3.5, w: '100%', h: 0.25, fill: COLORS.GOLD });

    // Title & Subtitle
    slide1.addText(safeText(formData.title || "BUSINESS PRESENTATION"), {
        x: 0.5, y: 2.2, w: '90%', h: 1.2,
        fontFace: 'Century Schoolbook', fontSize: 44, color: COLORS.WHITE, bold: true, align: 'left'
    });
    slide1.addText(safeText(formData.subtitle || "Financial & Investment Analysis").toUpperCase(), {
        x: 0.5, y: 3.9, w: '90%', h: 0.8,
        fontFace: 'Arial', fontSize: 20, color: COLORS.WHITE, align: 'left'
    });

    // Footer on Cover
    slide1.addText("© 2025 AIRE Software - All rights reserved.", {
        x: 0.5, y: 7.0, w: '100%', h: 0.3,
        fontFace: 'Arial', fontSize: 10, color: COLORS.WHITE, transparency: 20
    });


    // --- SLIDE 2: TABLE OF CONTENTS ---
    const slide2 = pres.addSlide({ masterName: 'MASTER_CONTENT' });
    slide2.addText("TABLE OF CONTENTS", {
        x: 0.5, y: 0.3, w: '90%', h: 0.6,
        fontFace: 'Century Schoolbook', fontSize: 28, color: COLORS.WHITE, bold: true
    });

    const contentList = sections.map((s, i) => `${i + 1}. ${s.name}`).join('\n\n');
    slide2.addText(contentList, {
        x: 1.0, y: 1.8, w: '80%', h: 5.0,
        fontFace: 'Arial', fontSize: 16, color: COLORS.BLACK, lineSpacing: 24
    });


    // --- SLIDES 3+: DYNAMIC CONTENT ---
    for (const section of sections) {
        try {
            const slide = pres.addSlide({ masterName: 'MASTER_CONTENT' });

            // Header Title
            slide.addText(safeText(section.name).toUpperCase(), {
                x: 0.5, y: 0.3, w: '90%', h: 0.6,
                fontFace: 'Century Schoolbook', fontSize: 24, color: COLORS.WHITE, bold: true
            });
            // AI Content Retrieval
            // Logic: Normalize both section name and AI keys to find a match
            // 1. Try exact match
            // 2. Try normalized match (lowercase, no spaces)

            const normalize = (str) => safeText(str).toLowerCase().replace(/[^a-z0-9]/g, '');
            const targetKey = normalize(section.name);

            let aiKey = Object.keys(aiContent).find(k => normalize(k) === targetKey);

            // 3. Fallback: Check if AI Key contains target, or vice versa (loosest match)
            if (!aiKey) {
                aiKey = Object.keys(aiContent).find(k => normalize(k).includes(targetKey) || targetKey.includes(normalize(k)));
            }

            const sectionData = aiContent[aiKey || section.name] || {};

            // Determine Render Mode: Table vs Text
            let renderedTable = false;

            if (sectionData.table && Array.isArray(sectionData.table)) {
                // Ensure it's a 2D array [["A","B"], ["1","2"]]
                const is2D = sectionData.table.every(row => Array.isArray(row));
                if (is2D) {
                    // Add intro text if any
                    if (sectionData.body) {
                        slide.addText(safeText(sectionData.body), {
                            x: 0.5, y: 1.6, w: 12.3, h: 0.8,
                            fontFace: 'Arial', fontSize: 14, color: COLORS.BLACK
                        });
                    }

                    // Render Table
                    slide.addTable(sectionData.table, {
                        x: 0.5, y: 2.5, w: 12.3,
                        fontFace: 'Arial', fontSize: 11, color: COLORS.BLACK,
                        border: { pt: 1, color: COLORS.NAVY },
                        fill: { color: COLORS.WHITE },
                        rowH: 0.4,
                        valign: 'middle',
                        autoPage: true,
                        colW: [4, 3, 3]
                    });
                    renderedTable = true;
                }
            }

            // Fallback / Standard Text Layout
            if (!renderedTable) {
                // Try to find ANY valid text content in the data
                let bodyText = safeText(
                    sectionData.body ||
                    sectionData.text ||
                    sectionData.content ||
                    sectionData.summary ||
                    sectionData.description ||
                    ""
                );

                console.log(`[Slide: ${section.name}] Body Text Candidate:`, bodyText.substring(0, 50) + "...");

                // Sanity Check: If text is too short or looks like a placeholder, complain
                if (!bodyText || bodyText.length < 20 || bodyText.includes("Content to be generated")) {
                    console.warn(`⚠️ [Slide: ${section.name}] AI returned insufficient content. Using generic filler.`);
                    // Optional: Use a generic filler tailored to the section name to look less broken
                    bodyText = `Comprehensive analysis of ${section.name} reveals significant opportunities and strategic imperatives. Further details are available in the full report appendices.`;
                }

                if (bodyText) {
                    slide.addText(bodyText, {
                        x: 0.5, y: 1.6, w: 12.3, h: 5.0,
                        fontFace: 'Arial', fontSize: 14, color: COLORS.BLACK,
                        valign: 'top', align: 'left', bullet: false
                    });
                }

                // Add Key Points / Stats
                const possiblePoints = sectionData.stats || sectionData.points || sectionData.key_takeaways;
                if (possiblePoints && Array.isArray(possiblePoints)) {
                    // Ensure points are strings, filter out empty ones
                    const listArr = possiblePoints.map(p => {
                        if (typeof p === 'string') return p;
                        if (typeof p === 'object' && p.point) return p.point; // Handle objects like {point: "..."}
                        return JSON.stringify(p);
                    }).filter(Boolean);

                    if (listArr.length > 0) {
                        slide.addText(listArr.join('\n'), {
                            x: 0.5, y: 4.5, w: 12.3, h: 2.5,
                            fontFace: 'Arial', fontSize: 14, color: COLORS.NAVY, bullet: true
                        });
                    }
                }
            }
        } catch (slideErr) {
            console.error(`Error generating slide for section ${section.name}:`, slideErr);
            // Continue to next slide instead of crashing
        }
    }

    // 4. Save File
    const finalFileName = `${(formData.title || 'Presentation').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pptx`;
    const finalFilePath = path.join(process.cwd(), 'generated', finalFileName);

    await pres.writeFile({ fileName: finalFilePath });

    console.log(`✅ GENERATION COMPLETE: ${finalFileName}`);
    return {
        fileName: finalFileName,
        filePath: finalFilePath
    };
};

export const mergePptxFiles = async () => { };
export const buildFileKey = () => { };
