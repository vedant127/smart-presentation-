
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import PresentationType from './src/models/PresentationType.js';
import { assemblePresentation } from './src/services/presentationServiceNew.js';
import PizZip from 'pizzip';

dotenv.config();

const verifyE2E = async () => {
    console.log('--- E2E VERIFICATION START ---');
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-presentation-machine');
        console.log('1. DB Connected.');

        const type = await PresentationType.findOne({ name: 'Feasibility Study' });
        if (!type) throw new Error('Feasibility Study type not found in DB. Run seed_db.js first!');
        console.log('2. Presentation Type Found.');

        const formData = {
            title: 'E2E VERIFICATION TEST',
            clientName: 'Deepmind User',
            city: 'Dubai',
            assetType: 'Hotel',
            category: '3 Star',
            specifications: 'Leisure'
        };

        const plots = [
            { criteria: { city: 'Dubai', assetType: 'Hotel', category: '3 Star', specifications: 'Leisure' } }
        ];

        console.log('3. Starting Assembly...');
        const result = await assemblePresentation({
            presentationType: type,
            formData,
            plots,
            userId: '000000000000000000000000'
        });

        console.log('4. Assembly Finished:', result.fileName);

        if (!fs.existsSync(result.filePath)) throw new Error('Output file does not exist on disk!');

        console.log('5. Validating Output Content...');
        const data = fs.readFileSync(result.filePath);
        const zip = new PizZip(data);
        const slides = Object.keys(zip.files).filter(f => f.startsWith('ppt/slides/slide'));

        let junkFound = false;
        const junkList = ['hhhahah', 'jijijij', 'huhuhu']; // Common culprits

        for (const slide of slides) {
            const xml = zip.file(slide).asText().toLowerCase();
            for (const junk of junkList) {
                if (xml.includes(junk)) {
                    console.error(`ERROR: Still found junk "${junk}" in ${slide}`);
                    junkFound = true;
                }
            }
        }

        if (junkFound) {
            console.error('--- VERIFICATION FAILED: Junk found in output ---');
        } else {
            console.log('--- VERIFICATION SUCCESS: File is clean and structure is correct! ---');
        }

        await mongoose.disconnect();
        process.exit(junkFound ? 1 : 0);
    } catch (err) {
        console.error('--- E2E VERIFICATION FAILED ---');
        console.error(err);
        process.exit(1);
    }
};

verifyE2E();
