import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AI Content Generation Service
 * Uses Google Gemini to generate dynamic business content for presentations.
 */

// Initialize Gemini
// Note: Ensure GEMINI_API_KEY is in your .env file
const getModel = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("⚠️ GEMINI_API_KEY is missing. Using fallback content.");
        return null;
    }
    return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-1.5-flash" });
};

/**
 * Generates structured content for the feasibility study based on the topic.
 * @param {string} topic - The main title/topic of the presentation
 * @param {string} subtitle - Optional context
 * @returns {Promise<Object>} JSON object with text content
 */
export const generateSlideContent = async (topic, subtitle = '') => {
    const model = getModel();
    if (!model) return null; // Trigger fallback

    const prompt = `
    Act as a senior business analyst. Create content for a Professional Feasibility Study Presentation.
    
    Project Title: "${topic}"
    Context/Subtitle: "${subtitle}"

    Return ONLY a purely valid JSON object (no markdown, no backticks) with the following specific fields:

    {
        "title_slide": {
            "subtitle": "A professional, concise subtitle for this project (max 8 words)"
        },
        "executive_summary": {
            "market_opportunity_title": "Market Opportunity",
            "market_opportunity_text": "Write 3 professional sentences analyzing the market potential for this specific topic. Focus on growth trends and demand.",
            "recommendation_title": "Strategic Recommendation",
            "recommendation_text": "Write 3 professional sentences recommending a specific strategy or approach for this project. Mention a competitive advantage.",
            "kpis": [
                { "label": "Projected ROI", "value": "XX%" },
                { "label": "Est. Revenue", "value": "$X.X M" },
                { "label": "Breakeven", "value": "X Years" },
                { "label": "Risk Level", "value": "Low/Med" }
            ]
        },
        "market_projections": {
            "chart_title": "Projected Growth Analysis",
            "chart_insight": "A one-sentence insight about the chart data."
        }
    }
    
    Ensure the data is realistic for the given topic. The KPIs should look professional.
    `;

    try {
        console.log(`🤖 Asking Gemini to generate content for: ${topic}...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // simple cleanup to ensure valid JSON
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("❌ AI Generation Failed:", error.message);
        return null;
    }
};
