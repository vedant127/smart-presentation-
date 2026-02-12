import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import PresentationType from '../models/PresentationType.js';
import LibraryItem from '../models/LibraryItem.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const inspect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        console.log('\n--- Presentation Types ---');
        const types = await PresentationType.find({});
        types.forEach(t => console.log(`ID: ${t._id}, Name: "${t.name}"`));

        console.log('\n--- Library Items (Top Level) ---');
        const items = await LibraryItem.find({ parentId: null });
        items.forEach(i => console.log(`ID: ${i._id}, Name: "${i.name}", Type: ${i.type}, Path: "${i.path}"`));

        // Start Cleanup if duplicates found
        if (process.argv.includes('--fix')) {
            console.log('\n--- FIXING DUPLICATES ---');

            // 1. Fix Presentation Types
            const allowedTypes = ['Credential Report', 'Feasibility Study'];
            const namesSeen = new Set();
            for (const t of types) {
                if (!allowedTypes.includes(t.name) && !t.name.includes('Accreditation')) {
                    // Keep unknown types? User said "Only 2".
                    // But strictly, let's just dedup the known ones.
                }

                // If standard type and seen before, delete
                if (namesSeen.has(t.name)) {
                    console.log(`Deleting Duplicate PresentationType: ${t.name} (${t._id})`);
                    await PresentationType.findByIdAndDelete(t._id);
                } else {
                    namesSeen.add(t.name);
                }
            }

            // 2. Fix Library Items
            const pathSeen = new Set();
            for (const i of items) {
                // Determine uniqueness by Name for top level? Or Path?
                // The issue is likely same name, different ID.
                const key = i.name.trim(); // Normalize
                if (pathSeen.has(key)) {
                    console.log(`Deleting Duplicate LibraryItem: ${i.name} (${i._id})`);
                    await LibraryItem.findByIdAndDelete(i._id);
                    // Also delete children? Library scanning handles that usually, but good to be clean
                    await LibraryItem.deleteMany({ parentId: i._id });
                } else {
                    pathSeen.add(key);
                }
            }
            console.log('Fix complete.');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

inspect();
