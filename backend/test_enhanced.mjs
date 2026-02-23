import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-presentation-machine');
    const PresentationType = (await import('./src/models/PresentationType.js')).default;
    const { assemblePresentation } = await import('./src/services/presentationServiceEnhanced.js');

    const type = await PresentationType.findOne({ name: 'Feasibility Study' });
    if (!type) throw new Error('No Feasibility Study type found!');

    console.log(`Testing Enhanced Service with ${type.sections.length} sections...`);

    const formData = {
        title: 'ENHANCED TEST',
        clientName: 'Test Client',
        City: 'Dubai',
        'Asset Type': 'Residential',
        Category: 'Apartments',
        Specifications: 'Luxury',
    };

    const plots = [
        { criteria: { city: 'Dubai', assetType: 'Residential', category: 'Apartments', specifications: 'Luxury' } }
    ];

    const result = await assemblePresentation({ presentationType: type, formData, plots, userId: '000000' });
    console.log('✅ RESULT:', result.fileName, '| Slides:', result.slideCount);

    await mongoose.disconnect();
};

test().catch(e => { console.error('❌ TEST FAILED:', e.message); process.exit(1); });
