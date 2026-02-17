import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate content using Gemini AI
 * @param {string} prompt - The prompt for content generation
 * @param {object} context - Additional context data
 * @returns {Promise<string>} Generated content
 */
export const generateContent = async (prompt, context = {}) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        // Build enhanced prompt with context
        const enhancedPrompt = buildPromptWithContext(prompt, context);

        const result = await model.generateContent(enhancedPrompt);
        const response = await result.response;
        const text = response.text();

        return text;
    } catch (error) {
        console.error('Gemini AI Error:', error.message);
        throw new Error(`Gemini AI generation failed: ${error.message}`);
    }
};

/**
 * Generate market analysis content
 */
export const generateMarketAnalysis = async (city, assetType, category, specifications) => {
    const prompt = `Generate a comprehensive market analysis for a real estate feasibility study with the following details:
    
City: ${city}
Asset Type: ${assetType}
Category: ${category}
Specifications: ${specifications}

Please provide:
1. Market Overview (2-3 paragraphs)
2. Supply Analysis (current supply, pipeline projects)
3. Demand Drivers (key factors driving demand)
4. Price Trends (historical and projected)
5. Key Market Indicators (occupancy rates, rental yields, etc.)

Format the output in a professional, consultant-grade style suitable for a boardroom presentation.`;

    return await generateContent(prompt, { city, assetType, category, specifications });
};

/**
 * Generate executive summary
 */
export const generateExecutiveSummary = async (projectName, city, assetType, plots) => {
    const prompt = `Generate an executive summary for a real estate feasibility study:

Project Name: ${projectName}
Location: ${city}
Asset Type: ${assetType}
Number of Plots: ${plots ? plots.length : 1}

Please provide a concise executive summary (3-4 paragraphs) covering:
1. Project Overview
2. Market Opportunity
3. Financial Viability
4. Key Recommendations

Use professional, consultant-grade language.`;

    return await generateContent(prompt, { projectName, city, assetType });
};

/**
 * Generate financial projections
 */
export const generateFinancialProjections = async (city, assetType, category, specifications) => {
    const prompt = `Generate financial projections for a real estate development:

City: ${city}
Asset Type: ${assetType}
Category: ${category}
Specifications: ${specifications}

Please provide:
1. Development Cost Estimate
2. Revenue Projections (5 years)
3. Operating Expenses
4. Cash Flow Analysis
5. ROI and IRR estimates
6. Break-even Analysis

Format as professional financial analysis with realistic numbers based on market standards.`;

    return await generateContent(prompt, { city, assetType, category, specifications });
};

/**
 * Generate development recommendations
 */
export const generateDevelopmentRecommendations = async (city, assetType, category, specifications) => {
    const prompt = `Generate development recommendations for a real estate project:

City: ${city}
Asset Type: ${assetType}
Category: ${category}
Specifications: ${specifications}

Please provide:
1. Optimal Development Mix
2. Unit Sizing Recommendations
3. Amenities and Features
4. Pricing Strategy
5. Phasing Recommendations
6. Risk Mitigation Strategies

Use professional consultant language with specific, actionable recommendations.`;

    return await generateContent(prompt, { city, assetType, category, specifications });
};

/**
 * Generate project background
 */
export const generateProjectBackground = async (projectName, city, siteArea, clientName) => {
    const prompt = `Generate a project background section for a feasibility study:

Project Name: ${projectName}
Location: ${city}
Site Area: ${siteArea || 'TBD'}
Client: ${clientName || 'Confidential'}

Please provide:
1. Project Introduction
2. Site Location and Context
3. Development Objectives
4. Scope of Study

Format in professional consultant style, 2-3 paragraphs.`;

    return await generateContent(prompt, { projectName, city });
};

/**
 * Build enhanced prompt with context
 */
const buildPromptWithContext = (basePrompt, context) => {
    let enhancedPrompt = basePrompt;

    // Add general context
    enhancedPrompt += `\n\nAdditional Context:`;
    enhancedPrompt += `\nThis is for a professional real estate feasibility study presentation.`;
    enhancedPrompt += `\nThe output will be used in a PowerPoint presentation for clients and investors.`;
    enhancedPrompt += `\nUse industry-standard terminology and metrics.`;
    enhancedPrompt += `\nBe specific and data-driven where possible.`;

    return enhancedPrompt;
};

/**
 * Generate slide-specific content based on section name
 */
export const generateSlideContent = async (sectionName, formData, plotData = {}) => {
    const city = formData.city || plotData.city || 'Unknown City';
    const assetType = formData.assetType || plotData.assetType || 'Unknown Asset Type';
    const category = formData.category || plotData.category || '';
    const specifications = formData.specifications || plotData.specifications || '';
    const projectName = formData.projectName || formData.title || 'Real Estate Development';

    try {
        switch (sectionName.toLowerCase()) {
            case '03_project background':
            case 'project background':
                return await generateProjectBackground(projectName, city, formData.siteArea, formData.clientName);

            case '04_executive summary':
            case 'executive summary':
                return await generateExecutiveSummary(projectName, city, assetType, formData.plots);

            case '06_market overview':
            case 'market overview':
                return await generateMarketAnalysis(city, assetType, category, specifications);

            case '07_development recommendations part 1':
            case '08_development recommendations part 2':
            case '09_development recommendations part 3':
            case 'development recommendations':
                return await generateDevelopmentRecommendations(city, assetType, category, specifications);

            case '10_financial & investment analysis':
            case 'financial analysis':
                return await generateFinancialProjections(city, assetType, category, specifications);

            default:
                return `Content for ${sectionName}\n\nProject: ${projectName}\nLocation: ${city}\nAsset Type: ${assetType}`;
        }
    } catch (error) {
        console.error(`Error generating content for ${sectionName}:`, error.message);
        return `[AI Content Generation Failed for ${sectionName}]`;
    }
};

export default {
    generateContent,
    generateMarketAnalysis,
    generateExecutiveSummary,
    generateFinancialProjections,
    generateDevelopmentRecommendations,
    generateProjectBackground,
    generateSlideContent
};
