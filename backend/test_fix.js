
import { assemblePresentation } from './src/services/presentationServiceNew.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await assemblePresentation({
        presentationType: { name: 'Feasibility Study' },
        formData: { title: 'TEST FIX', city: 'Dubai' },
        plots: [{ criteria: { city: 'Dubai', assetType: 'Hotel', category: '3-star', specifications: 'Leisure' } }],
        userId: '000000000000000000000000'
    });
    console.log('RESULT:', result);
    await mongoose.disconnect();
};

test();
