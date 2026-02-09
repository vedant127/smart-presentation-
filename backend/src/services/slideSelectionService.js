
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const slideLibrary = require('./slideLibrary.json');

/**
 * Select slides based on city and requirements
 * 
 * @param {string} city - The city (Mumbai, Delhi, Bangalore, etc.)
 * @param {array} requirements - Array of categories needed 
 *                               Example: ["Financial Analysis", "Market Analysis"]
 * @param {string} projectType - Type of project (Residential, Commercial, etc.)
 * @returns {array} - Array of selected slide metadata
 */
export const selectSlides = (city, requirements, projectType) => {

    console.log(`Selecting slides for: City=${city}, Requirements=${requirements}, Type=${projectType}`);

    const library = slideLibrary.slideLibrary || [];

    // STEP 1: Filter by city
    let filteredSlides = library.filter(slide => {
        return slide.city === city;
    });

    console.log(`After city filter: ${filteredSlides.length} slides`);

    // STEP 2: Filter by category (requirements)
    if (requirements && requirements.length > 0) {
        filteredSlides = filteredSlides.filter(slide => {
            // Check if the slide's category is in the requirements list
            return requirements.includes(slide.category);
        });
    }

    console.log(`After requirement filter: ${filteredSlides.length} slides`);

    // STEP 3: Filter by project type
    if (projectType) {
        filteredSlides = filteredSlides.filter(slide => {
            // Check if the slide supports this project type
            // Some slides might support multiple types e.g. ["Residential", "Commercial"]
            return slide.projectTypes.includes(projectType);
        });
    }

    console.log(`After project type filter: ${filteredSlides.length} slides`);

    // STEP 4: Sort by relevance (most relevant first)
    filteredSlides.sort((a, b) => {
        // Priority: Slides with tables are more valuable for financial analysis
        if (a.hasTable && !b.hasTable) return -1;
        if (!a.hasTable && b.hasTable) return 1;

        // Secondary sort: Slide number (preserve logical order from original files)
        if (a.slideNumber < b.slideNumber) return -1;
        if (a.slideNumber > b.slideNumber) return 1;

        return 0;
    });

    return filteredSlides;
}
