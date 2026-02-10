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

    console.log(`\n========================================`);
    console.log(`🔍 SLIDE SELECTION STARTED`);
    console.log(`========================================`);
    console.log(`📍 City: ${city}`);
    console.log(`📋 Requirements: ${JSON.stringify(requirements)}`);
    console.log(`🏢 Project Type: ${projectType}`);
    console.log(`========================================\n`);

    const library = slideLibrary.slideLibrary || [];
    console.log(`📚 Total slides in library: ${library.length}`);

    // STEP 1: Filter by city
    let filteredSlides = library.filter(slide => {
        return slide.city === city;
    });

    console.log(`\n✅ STEP 1: City Filter (${city})`);
    console.log(`   Found ${filteredSlides.length} slides for ${city}`);
    if (filteredSlides.length > 0) {
        console.log(`   Slides: ${filteredSlides.map(s => s.id).join(', ')}`);
    }

    // STEP 2: Filter by category (requirements)
    if (requirements && requirements.length > 0) {
        filteredSlides = filteredSlides.filter(slide => {
            // Check if the slide's category is in the requirements list
            return requirements.includes(slide.category);
        });

        console.log(`\n✅ STEP 2: Requirements Filter`);
        console.log(`   Found ${filteredSlides.length} slides matching requirements`);
        if (filteredSlides.length > 0) {
            console.log(`   Slides: ${filteredSlides.map(s => `${s.id} (${s.category})`).join(', ')}`);
        }
    }

    // STEP 3: Filter by project type
    if (projectType) {
        filteredSlides = filteredSlides.filter(slide => {
            // Check if the slide supports this project type
            // Some slides might support multiple types e.g. ["Residential", "Commercial"]
            return slide.projectTypes.includes(projectType);
        });

        console.log(`\n✅ STEP 3: Project Type Filter (${projectType})`);
        console.log(`   Found ${filteredSlides.length} slides for ${projectType}`);
        if (filteredSlides.length > 0) {
            console.log(`   Slides: ${filteredSlides.map(s => `${s.id} (${s.projectTypes.join('/')})`).join(', ')}`);
        }
    }

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

    // STEP 5: Remove duplicates by ID (in case same slide selected multiple times)
    const uniqueSlides = Array.from(
        new Map(filteredSlides.map(slide => [slide.id, slide])).values()
    );

    // STEP 6: Limit to 1 slide per category (to avoid duplicate content)
    // Since slides are sorted by relevance, we take the first (best) slide for each category
    const seenCategories = new Set();
    const finalSlides = uniqueSlides.filter(slide => {
        if (seenCategories.has(slide.category)) {
            console.log(`   ⚠️  Skipping duplicate category: [${slide.id}] ${slide.title} (${slide.category} already selected)`);
            return false;
        }
        seenCategories.add(slide.category);
        return true;
    });

    console.log(`\n========================================`);
    console.log(`📊 FINAL SELECTION: ${finalSlides.length} slides`);
    console.log(`   (${uniqueSlides.length - finalSlides.length} duplicates removed by category)`);
    console.log(`========================================`);
    finalSlides.forEach((slide, index) => {
        console.log(`${index + 1}. [${slide.id}] ${slide.title}`);
        console.log(`   📄 Source: ${slide.sourceFile} (Slide #${slide.slideNumber})`);
        console.log(`   🏙️  City: ${slide.city} | 🏢 Type: ${slide.projectTypes.join(', ')} | 📂 Category: ${slide.category}`);
    });
    console.log(`========================================\n`);

    return finalSlides;
}
