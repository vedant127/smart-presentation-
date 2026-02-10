/**
 * Input Validation & Auto-correction Utility
 * Fixes common spelling mistakes in user input
 */

// Common typos dictionary
const TYPO_CORRECTIONS = {
    // Business typos
    'busniess': 'Business',
    'bussiness': 'Business',
    'buisness': 'Business',
    'bussines': 'Business',

    // Commercial typos
    'commerical': 'Commercial',
    'comercial': 'Commercial',
    'commecial': 'Commercial',

    // Residential typos
    'residencial': 'Residential',
    'residental': 'Residential',
    'residantial': 'Residential',

    // Analysis typos
    'anaylsis': 'Analysis',
    'analisis': 'Analysis',
    'analysys': 'Analysis',

    // Investment typos
    'investement': 'Investment',
    'invesment': 'Investment',

    // Presentation typos
    'presntation': 'Presentation',
    'presentaion': 'Presentation',

    // Mumbai typos
    'Mumbay': 'Mumbai',
    'Bombay': 'Mumbai',

    // Delhi typos
    'Dehli': 'Delhi',
    'Dilli': 'Delhi',

    // Bangalore typos
    'Bangalor': 'Bangalore',
    'Bengaluru': 'Bangalore',
    'Banglore': 'Bangalore'
};

/**
 * Auto-correct common typos in text
 * @param {string} text - Text to correct
 * @returns {object} - { corrected: string, changed: boolean, corrections: array }
 */
export const autoCorrectTypos = (text) => {
    if (!text || typeof text !== 'string') {
        return { corrected: text, changed: false, corrections: [] };
    }

    let corrected = text;
    const corrections = [];

    // Check each typo pattern
    for (const [typo, correct] of Object.entries(TYPO_CORRECTIONS)) {
        // Case-insensitive replacement
        const regex = new RegExp(typo, 'gi');

        if (regex.test(corrected)) {
            const before = corrected;
            corrected = corrected.replace(regex, (match) => {
                // Preserve original case pattern
                if (match === match.toUpperCase()) {
                    return correct.toUpperCase();
                } else if (match[0] === match[0].toUpperCase()) {
                    return correct;
                } else {
                    return correct.toLowerCase();
                }
            });

            if (before !== corrected) {
                corrections.push({ from: typo, to: correct });
            }
        }
    }

    return {
        corrected,
        changed: corrections.length > 0,
        corrections
    };
};

/**
 * Validate and clean form data
 * @param {object} formData - Raw form data from user
 * @returns {object} - Cleaned form data with corrections logged
 */
export const validateFormData = (formData) => {
    const cleaned = { ...formData };
    const allCorrections = [];

    // Fields to validate
    const fieldsToValidate = [
        'title',
        'subtitle',
        'city',
        'projectType',
        'company_name'
    ];

    fieldsToValidate.forEach(field => {
        if (cleaned[field]) {
            const result = autoCorrectTypos(cleaned[field]);

            if (result.changed) {
                console.log(`✅ Auto-corrected "${field}": "${formData[field]}" → "${result.corrected}"`);
                allCorrections.push({
                    field,
                    original: formData[field],
                    corrected: result.corrected,
                    corrections: result.corrections
                });
                cleaned[field] = result.corrected;
            }
        }
    });

    if (allCorrections.length > 0) {
        console.log(`📝 Total corrections made: ${allCorrections.length}`);
    }

    return {
        data: cleaned,
        corrections: allCorrections
    };
};

/**
 * Check if text contains known typos
 * @param {string} text - Text to check
 * @returns {boolean} - True if typos found
 */
export const hasTypos = (text) => {
    if (!text || typeof text !== 'string') return false;

    for (const typo of Object.keys(TYPO_CORRECTIONS)) {
        const regex = new RegExp(typo, 'gi');
        if (regex.test(text)) {
            return true;
        }
    }

    return false;
};

export default {
    autoCorrectTypos,
    validateFormData,
    hasTypos,
    TYPO_CORRECTIONS
};
