/**
 * Simulates the EXACT payload the frontend DynamicGenerator sends
 * when a user selects a plot with:
 *   City = "Dubai", Asset Type = "Residential", Category = "Apartments", Specifications = "Luxury"
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-presentation-machine');
    const PresentationType = (await import('./src/models/PresentationType.js')).default;
    const { assemblePresentation } = await import('./src/services/presentationServiceEnhanced.js');

    const type = await PresentationType.findOne({ name: 'Feasibility Study' });
    if (!type) throw new Error('Feasibility Study type not found!');

    // ─── Exactly what the frontend sends ───────────────────────────
    const plotData = {
        'City': 'Dubai',      // Capital C, with space — as the DB criterion is named
        'Asset Type': 'Residential', // Space in key
        'Category': 'Apartments',
        'Specifications': 'Luxury'
    };

    const formData = {
        title: 'Dubai Residential Feasibility Study',
        projectName: 'Dubai Residential Feasibility Study',
        clientName: 'Test Client Ltd',
        // First plot's data merged in (as DynamicGenerator does)
        ...plotData
    };

    const plots = [
        { criteria: plotData, data: plotData }
    ];

    console.log('\n📤 Sending payload (simulating frontend):\n');
    console.log('  formData:', JSON.stringify(formData, null, 2));
    console.log('  plots   :', JSON.stringify(plots, null, 2));

    const result = await assemblePresentation({ presentationType: type, formData, plots, userId: '000000' });

    console.log(`\n✅ RESULT: ${result.fileName} | Slides: ${result.slideCount}`);
    if (result.slideCount < 20) {
        console.error('⛔ WARNING: Slide count is suspiciously low — check the mapping logic!');
    } else {
        console.log('🎉 Looks good! Presentation has plenty of slides.');
    }

    await mongoose.disconnect();
};

run().catch(e => { console.error('❌ TEST FAILED:', e.message); process.exit(1); });
