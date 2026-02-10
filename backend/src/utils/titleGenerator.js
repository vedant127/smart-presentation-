/**
 * Title Generation Utilities
 * Ensures TOC titles match actual slide titles
 */

/**
 * Generate the ACTUAL title that will be used on the slide
 * This must match exactly what the helper functions create
 * 
 * @param {Object} slideInfo - Slide metadata from selection
 * @param {string} city - City name
 * @param {string} projectType - Project type
 * @returns {string} - The exact title that will appear on the slide
 */
export const generateActualSlideTitle = (slideInfo, city, projectType) => {
    // Match the logic in slideContentHelpers.js

    // Investment Assumptions (specific category)
    if (slideInfo.category === 'Investment Assumptions' ||
        slideInfo.title.includes('Investment Assumptions') ||
        (slideInfo.category === 'Financial Analysis' && slideInfo.title.includes('Investment'))) {
        return `Investment Assumptions - ${city} ${projectType}`;
    }

    // Cash Flow Projections (specific category)
    if (slideInfo.category === 'Cash Flow Projections' ||
        slideInfo.title.includes('Cash Flow')) {
        return `Cash Flow Analysis - ${city} ${projectType}`;
    }

    // ROI Analysis / Financial Analysis (general)
    if (slideInfo.title.includes('ROI') || slideInfo.title.includes('Return')) {
        return `ROI Analysis - ${city} ${projectType}`;
    }

    // Market Analysis
    if (slideInfo.category === 'Market Analysis') {
        return `${city} ${projectType} Market Overview`;
    }

    // Site Assessment
    if (slideInfo.category === 'Site Assessment') {
        if (slideInfo.title.includes('Location')) {
            return `${city} Location Analysis`;
        }
        if (slideInfo.title.includes('Regulatory')) {
            return `${city} Regulatory Framework`;
        }
    }

    // Fallback: use original title
    return slideInfo.title;
};

/**
 * Generate TOC items with ACTUAL titles that will be used
 * 
 * @param {Array} selectedSlides - Array of selected slide objects
 * @param {string} city - City name
 * @param {string} projectType - Project type
 * @returns {Array} - Array of actual titles for TOC
 */
export const generateTOCTitles = (selectedSlides, city, projectType) => {
    return selectedSlides.map(slideInfo => {
        return generateActualSlideTitle(slideInfo, city, projectType);
    });
};
