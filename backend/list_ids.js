import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import PresentationType from './src/models/PresentationType.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const listIds = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/smart-presentation-machine');
        console.log("Connected to DB");

        const types = await PresentationType.find({});
        console.log("\n====== PRESENTATION TYPES ======");
        types.forEach(t => {
            console.log(`TYPE: "${t.name}"`);
            console.log(`ID:   ${t._id}`);
            console.log("--------------------------------");
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

listIds();
