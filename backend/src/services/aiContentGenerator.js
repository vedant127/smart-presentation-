import * as geminiService from './geminiService.js';
import * as openaiService from './openaiService.js';

/**
 * Unified AI Content Generator
 * Uses Gemini as primary, OpenAI as fallback
 */

/**
 * Generate content with automatic fallback
 * @param {string} type - Type of content to generate
 * @param {object} data - Data for content generation
 * @returns {Promise<string>} Generated content
 */
export const generateContent = async (type, data) => {
    try {
        // Try Gemini first
        console.log(`🤖 Generating ${type} content with Gemini AI...`);
        return await generateWithGemini(type, data);
    } catch (geminiError) {
        console.warn(`⚠️ Gemini failed: ${geminiError.message}`);
        console.log(`🔄 Falling back to OpenAI...`);

        try {
            // Fallback to OpenAI
            return await generateWithOpenAI(type, data);
        } catch (openaiError) {
            console.error(`❌ OpenAI also failed: ${openaiError.message}`);
            // Return placeholder content as last resort
            return generatePlaceholderContent(type, data);
        }
    }
};

/**
 * Generate content using Gemini
 */
const generateWithGemini = async (type, data) => {
    switch (type) {
        case 'market-analysis':
            return await geminiService.generateMarketAnalysis(
                data.city,
                data.assetType,
                data.category,
                data.specifications
            );

        case 'executive-summary':
            return await geminiService.generateExecutiveSummary(
                data.projectName,
                data.city,
                data.assetType,
                data.plots
            );

        case 'financial-projections':
            return await geminiService.generateFinancialProjections(
                data.city,
                data.assetType,
                data.category,
                data.specifications
            );

        case 'development-recommendations':
            return await geminiService.generateDevelopmentRecommendations(
                data.city,
                data.assetType,
                data.category,
                data.specifications
            );

        case 'project-background':
            return await geminiService.generateProjectBackground(
                data.projectName,
                data.city,
                data.siteArea,
                data.clientName
            );

        case 'slide-content':
            return await geminiService.generateSlideContent(
                data.sectionName,
                data.formData,
                data.plotData
            );

        default:
            throw new Error(`Unknown content type: ${type}`);
    }
};

/**
 * Generate content using OpenAI
 */
const generateWithOpenAI = async (type, data) => {
    switch (type) {
        case 'market-analysis':
            return await openaiService.generateMarketAnalysis(
                data.city,
                data.assetType,
                data.category,
                data.specifications
            );

        case 'executive-summary':
            return await openaiService.generateExecutiveSummary(
                data.projectName,
                data.city,
                data.assetType,
                data.plots
            );

        case 'financial-projections':
            return await openaiService.generateFinancialProjections(
                data.city,
                data.assetType,
                data.category,
                data.specifications
            );

        case 'development-recommendations':
            return await openaiService.generateDevelopmentRecommendations(
                data.city,
                data.assetType,
                data.category,
                data.specifications
            );

        case 'project-background':
            return await openaiService.generateProjectBackground(
                data.projectName,
                data.city,
                data.siteArea,
                data.clientName
            );

        default:
            throw new Error(`Unknown content type: ${type}`);
    }
};

/**
 * Generate placeholder content as last resort
 */
const generatePlaceholderContent = (type, data) => {
    console.warn(`⚠️ Using placeholder content for ${type}`);

    const city = data.city || 'the location';
    const assetType = data.assetType || 'the asset type';
    const projectName = data.projectName || 'this project';

    const placeholders = {
        'market-analysis': `Market Analysis for ${city} ${assetType}
        
This section provides a comprehensive analysis of the ${city} ${assetType} market, including current supply and demand dynamics, price trends, and key market indicators.

Key findings indicate strong market fundamentals with growing demand driven by population growth, economic development, and infrastructure improvements.`,

        'executive-summary': `Executive Summary - ${projectName}
        
This feasibility study evaluates the development potential of ${projectName} in ${city}. The analysis indicates favorable market conditions and strong financial viability for the proposed ${assetType} development.

Key recommendations include proceeding with the development in phases to optimize market absorption and maximize returns.`,

        'financial-projections': `Financial Projections
        
Development Cost: Estimated based on market standards for ${city} ${assetType} projects
Revenue Projections: 5-year forecast based on current market rates and absorption assumptions
ROI: Projected returns align with industry benchmarks for similar developments
Break-even: Expected within 3-4 years of project completion`,

        'development-recommendations': `Development Recommendations
        
Based on market analysis, the following development approach is recommended:
- Optimal unit mix tailored to ${city} market demand
- Competitive pricing strategy aligned with comparable projects
- Phased development to manage market risk
- Premium amenities to differentiate from competition`,

        'project-background': `Project Background - ${projectName}
        
${projectName} is a proposed ${assetType} development located in ${city}. This feasibility study evaluates the market opportunity, financial viability, and development strategy for the project.

The study provides comprehensive analysis to support investment decision-making.`,

        'slide-content': `${data.sectionName || 'Content'}
        
Project: ${projectName}
Location: ${city}
Asset Type: ${assetType}`
    };

    return placeholders[type] || `Content for ${type}\n\nProject: ${projectName}\nLocation: ${city}`;
};

/**
 * Generate content for specific slide section
 */
export const generateSlideContent = async (sectionName, formData, plotData = {}) => {
    return await generateContent('slide-content', {
        sectionName,
        formData,
        plotData
    });
};

/**
 * Batch generate content for multiple sections
 */
export const generateBatchContent = async (sections, formData, plotData = {}) => {
    const results = {};

    for (const section of sections) {
        try {
            results[section] = await generateSlideContent(section, formData, plotData);
        } catch (error) {
            console.error(`Error generating content for ${section}:`, error.message);
            results[section] = generatePlaceholderContent('slide-content', {
                sectionName: section,
                ...formData,
                ...plotData
            });
        }
    }

    return results;
};

export default {
    generateContent,
    generateSlideContent,
    generateBatchContent
};
