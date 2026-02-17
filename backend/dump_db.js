
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PresentationType from './src/models/PresentationType.js';
import connectDatabase from './src/config/database.js';

dotenv.config();

const run = async () => {
    try {
        await connectDatabase();

        console.log('--- FEASIBILITY STUDY JSON ---');
        const fs = await PresentationType.findOne({ name: 'Feasibility Study' });
        console.log(JSON.stringify(fs, null, 2));

        console.log('--- CREDENTIAL REPORT JSON ---');
        const cr = await PresentationType.findOne({ name: 'Credential Report' });
        console.log(JSON.stringify(cr, null, 2));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

run();
