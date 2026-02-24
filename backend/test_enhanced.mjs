import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-presentation-machine');
    const PresentationType = (await import('./src/models/PresentationType.js')).default;
    const { assemblePresentation } = await import('./src/services/presentationServiceEnhanced.js');

    const type = await PresentationType.findOne({ name: 'Feasibility Study' });
    if (!type) throw new Error('No Feasibility Study type found!');

    const formData = {
        title: 'TEST_CLEAN_MERGE',
        projectName: 'Test Project',
        clientName: 'Test Client',
    };

    const plots = [
        { criteria: { city: 'Dubai', assetType: 'Residential', category: 'Apartments', specifications: 'Luxury' } }
    ];

    const result = await assemblePresentation({ presentationType: type, formData, plots, userId: '000000' });
    console.log('\n═══════════════════════════════════════');
    console.log(`  FILE : ${result.fileName}`);
    console.log(`  SLIDES: ${result.slideCount}`);
    console.log(`  SIZE  : ${(result.fileSize / 1024).toFixed(1)} KB`);
    console.log('═══════════════════════════════════════');

    await mongoose.disconnect();
};

test().catch(e => { console.error('❌ TEST FAILED:', e.message); process.exit(1); });
