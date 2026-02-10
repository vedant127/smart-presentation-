/**
 * AI Content Generation Service
 * Generates slide content using AI (fallback when no slides are selected)
 */

/**
 * Generate slide content for presentation sections
 * @param {string} title - Presentation title
 * @param {string} subtitle - Presentation subtitle
 * @param {Array} sections - Array of section objects
 * @param {Object} formData - Form data with additional context
 * @returns {Object} - Generated content for each section
 */
export const generateSlideContent = async (title, subtitle, sections, formData) => {
    console.log('🤖 AI Content Generation: Generating fallback content...');

    const content = {};

    // Generate simple content for each section
    sections.forEach(section => {
        const sectionName = section.name || section.title || 'Untitled Section';

        content[sectionName] = {
            title: sectionName,
            body: `This section provides comprehensive analysis of ${sectionName.toLowerCase()} for ${formData.city || 'the project'}. ` +
                `The ${formData.projectType || 'development'} project demonstrates strong potential with favorable market conditions. ` +
                `Key factors include strategic location, robust demand drivers, and attractive financial metrics.`,
            bullets: [
                `Strategic positioning in ${formData.city || 'target market'}`,
                `Comprehensive market analysis and feasibility assessment`,
                `Detailed financial projections and ROI calculations`,
                `Risk mitigation strategies and contingency planning`,
                `Implementation timeline and key milestones`
            ]
        };
    });

    console.log(`✅ Generated content for ${sections.length} sections`);
    return content;
};

/**
 * Simple fallback content generator (synchronous)
 */
export const generateSimpleContent = (sectionName, formData = {}) => {
    return {
        title: sectionName,
        body: `Analysis of ${sectionName} for ${formData.city || 'the project'}.`,
        bullets: [
            'Key insight 1',
            'Key insight 2',
            'Key insight 3'
        ]
    };
};
