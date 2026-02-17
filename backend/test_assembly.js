
import connectDatabase from './src/config/database.js';
import PresentationType from './src/models/PresentationType.js';
import { assemblePresentation } from './src/services/presentationServiceNew.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Fix for process.cwd() if not correct
// We assume we run from backend root

const run = async () => {
    try {
        await connectDatabase();
        const type = await PresentationType.findOne({ name: 'Feasibility Study' });
        if (!type) {
            console.error("Type not found");
            process.exit(1);
        }
        console.log('STARTING TEST for:', type.name);

        // Mock data matching the folders we have
        // Sections: 01_Cover Page, 02_Table of Contents (Fixed)
        // 06_Market Overview (Varying - needs City/Asset Type match)

        const result = await assemblePresentation({
            presentationType: type,
            formData: {
                title: "TEST RUN",
                city: "Mumbai",
                clientName: "Tester"
            },
            plots: [
                {
                    criteria: {
                        "City": "Mumbai",
                        "Asset Type": "Residential",
                        "Category": "Apartments",
                        "Specifications": "Luxury"
                    }
                }
            ],
            userId: "000000000000000000000000"
        });

        console.log('SUCCESS Result:', result.fileName);
    } catch (e) {
        console.error('FAILED:', e);
    }
    process.exit();
}
run();
