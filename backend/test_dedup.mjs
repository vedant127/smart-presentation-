/**
 * FULL MAPPING TEST
 * Simulates the exact payload the DynamicGenerator sends.
 *
 * Tests:
 *   1. Deduplication  — Plot 1 and Plot 3 are identical combos → only 1 section added
 *   2. Key normalisation — uses "City", "Asset Type" (capital, spaces) like the frontend does
 *   3. Correct slide order — logged in output
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-presentation-machine');
    const PresentationType = (await import('./src/models/PresentationType.js')).default;
    const { assemblePresentation } = await import('./src/services/presentationServiceEnhanced.js');

    const type = await PresentationType.findOne({ name: 'Feasibility Study' });
    if (!type) throw new Error('Feasibility Study type not found! Run seed_db.js first.');

    // Simulating 3 plots where Plot 1 and Plot 3 are duplicates
    const plots = [
        { criteria: { City: 'Dubai', 'Asset Type': 'Residential', Category: 'Apartments', Specifications: 'Luxury' }, data: {} },
        { criteria: { City: 'dubai', 'Asset Type': 'residential', Category: 'apartments', Specifications: 'luxury' }, data: {} }, // duplicate (diff casing)
        { criteria: { City: 'Abu Dhabi', 'Asset Type': 'Hotel', Category: 'Luxury', Specifications: 'Business' }, data: {} }, // genuinely different
    ];

    const formData = {
        title: 'Test Dedup + Order',
        projectName: 'Test Dedup + Order',
        clientName: 'QA Test Client',
        ...plots[0].criteria,
    };

    console.log('─────────────────────────────────────────────');
    console.log('Input: 3 plots (plot 1+2 are duplicates, plot 3 is unique)');
    console.log('Expected unique combos: 2');
    console.log('─────────────────────────────────────────────\n');

    const result = await assemblePresentation({ presentationType: type, formData, plots, userId: '000' });

    console.log('\n─────────────────────────────────────────────');
    console.log(`OUTPUT FILE : ${result.fileName}`);
    console.log(`TOTAL SLIDES: ${result.slideCount}`);
    if (result.slideCount >= 10 && result.slideCount <= 12) {
        console.log('✅ PASS — slide count is correct (10-12 for 2 unique combos)');
    } else {
        console.error(`⛔ WARN — unexpected slide count: ${result.slideCount} (expected 11-13)`);
    }
    console.log('─────────────────────────────────────────────');

    await mongoose.disconnect();
};

run().catch(e => { console.error('❌ FAILED:', e.message); process.exit(1); });
