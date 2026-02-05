import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

/**
 * AI Content Generation Service
 * Supports Google Gemini (Primary) and OpenAI (Fallback)
 */

const getGeminiModel = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    return new GoogleGenerativeAI(key).getGenerativeModel({ model: "gemini-1.5-flash" });
};

const getOpenAIClient = () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    return new OpenAI({ apiKey: key });
};

export const generateSlideContent = async (title, subtitle, sections, formData) => {
    const sectionNames = sections.map(s => s.name).join(', ');
    const userDetails = JSON.stringify(formData);

    // Unified Prompt - Enhanced for Specificity
    const prompt = `
    Act as a senior business consultant at AIRE Software. 
    Create a highly detailed, project-specific business presentation JSON object.

    CONTEXT:
    - Title: "${title}"
    - Subtitle: "${subtitle}"
    - User/Company Data: ${userDetails}
    
    INSTRUCTIONS:
    For EACH of the following sections, generate unique, specific, and realistic content. 
    DO NOT use generic phrases like "Comprehensive analysis reveals". 
    Actually write the analysis based on the context provided above.
    
    Required Sections: ${sectionNames}

    GUIDELINES:
    1. "body": Write 2-3 detailed paragraphs (approx 150 words) specific to this project's industry and location.
    2. "points": Provide 3-4 concrete, data-driven bullet points (use %, $, or specific metrics).
    3. For "Financial Investment Analysis", strictly return a "table" array: [["Category", "Cost", "Notes"], ["Item A", "$X", "..."], ...].
    
    CRITICAL OUTPUT FORMAT:
    Return ONLY a purely valid JSON object (no markdown) with keys matching the provided section names EXACTLY.
    
    Structure Example:
    {
        "${sectionNames.split(', ')[0]}": { 
             "body": "Specifically regarding ${title}, we observed...", 
             "points": ["Market grew by 12% in...", "Competitor X holds 20% share"] 
        },
        ...
    }
    `;

    // 1. Try Gemini
    const gemini = getGeminiModel();
    if (gemini) {
        try {
            console.log(`🤖 [Gemini] Generating content for: ${title}...`);
            const result = await gemini.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            console.log(`✅ [Gemini] Success. Content length: ${cleaned.length}`);
            return JSON.parse(cleaned);
        } catch (error) {
            console.error("❌ [Gemini] Failed:", error.message);
            // Fallthrough to OpenAI
        }
    } else {
        console.log("ℹ️ [Gemini] Skipped (Key missing).");
    }

    // 2. Try OpenAI
    const openai = getOpenAIClient();
    if (openai) {
        try {
            console.log(`🤖 [OpenAI] Generating content for: ${title}...`);
            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo-preview", // or gpt-3.5-turbo
                messages: [
                    { role: "system", content: "You are a specialized JSON generator for business presentations." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });
            const text = response.choices[0].message.content;
            console.log(`✅ [OpenAI] Success. Content length: ${text.length}`);
            return JSON.parse(text);
        } catch (error) {
            console.error("❌ [OpenAI] Failed:", error.message);
        }
    } else {
        console.log("ℹ️ [OpenAI] Skipped (Key missing).");
    }

    console.warn("⚠️ All AI providers failed. Returning empty content.");
    return {};
};
