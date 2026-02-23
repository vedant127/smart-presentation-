import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-presentation-machine');
    const PresentationType = (await import('./src/models/PresentationType.js')).default;
    const t = await PresentationType.findOne({ name: 'Feasibility Study' });
    if (t) {
        console.log('Total sections:', t.sections.length);
        t.sections.sort((a, b) => a.order - b.order).forEach(s =>
            console.log(`  [${s.order}] "${s.name}" | folder: "${s.folderPath}" | varying: ${s.isVarying}`)
        );
        console.log('\nCriteria:');
        (t.criteria || []).forEach(c => console.log(`  - ${c.name}`));
    } else {
        console.log('NOT FOUND - Run seed_db.js first');
    }
    await mongoose.disconnect();
};
run().catch(console.error);
