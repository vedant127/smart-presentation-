import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate content using OpenAI GPT-4
 * @param {string} prompt - The prompt for content generation
 * @param {object} context - Additional context data
 * @returns {Promise<string>} Generated content
 */
export const generateContent = async (prompt, context = {}) => {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional real estate consultant creating content for feasibility study presentations. Provide detailed, data-driven, and professionally formatted content suitable for boardroom presentations.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI Error:', error.message);
        throw new Error(`OpenAI generation failed: ${error.message}`);
    }
};

/**
 * Generate market analysis content
 */
export const generateMarketAnalysis = async (city, assetType, category, specifications) => {
    const prompt = `Generate a comprehensive market analysis for a real estate feasibility study:
    
City: ${city}
Asset Type: ${assetType}
Category: ${category}
Specifications: ${specifications}

Provide:
1. Market Overview (2-3 paragraphs)
2. Supply Analysis
3. Demand Drivers
4. Price Trends
5. Key Market Indicators

Use professional consultant language with specific data points.`;

    return await generateContent(prompt);
};

/**
 * Generate executive summary
 */
export const generateExecutiveSummary = async (projectName, city, assetType, plots) => {
    const prompt = `Generate an executive summary for a real estate feasibility study:

Project: ${projectName}
Location: ${city}
Asset Type: ${assetType}
Plots: ${plots ? plots.length : 1}

Provide a concise 3-4 paragraph executive summary covering project overview, market opportunity, financial viability, and key recommendations.`;

    return await generateContent(prompt);
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

Provide development costs, revenue projections (5 years), operating expenses, cash flow analysis, ROI/IRR estimates, and break-even analysis.`;

    return await generateContent(prompt);
};

/**
 * Generate development recommendations
 */
export const generateDevelopmentRecommendations = async (city, assetType, category, specifications) => {
    const prompt = `Generate development recommendations for:

City: ${city}
Asset Type: ${assetType}
Category: ${category}
Specifications: ${specifications}

Provide optimal development mix, unit sizing, amenities, pricing strategy, phasing, and risk mitigation strategies.`;

    return await generateContent(prompt);
};

/**
 * Generate project background
 */
export const generateProjectBackground = async (projectName, city, siteArea, clientName) => {
    const prompt = `Generate project background for:

Project: ${projectName}
Location: ${city}
Site Area: ${siteArea || 'TBD'}
Client: ${clientName || 'Confidential'}

Provide project introduction, site context, development objectives, and scope of study in 2-3 paragraphs.`;

    return await generateContent(prompt);
};

export default {
    generateContent,
    generateMarketAnalysis,
    generateExecutiveSummary,
    generateFinancialProjections,
    generateDevelopmentRecommendations,
    generateProjectBackground
};
