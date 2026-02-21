import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PresentationType from './src/models/PresentationType.js';

dotenv.config();

const seed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-presentation-machine');
        console.log('Connected.');

        // 1. CLEAR EXISTING
        await PresentationType.deleteMany({});
        console.log('Cleared existing PresentationTypes.');

        // 2. SEED FEASIBILITY STUDY
        const feasibilityStudy = {
            name: 'Feasibility Study',
            description: 'Standard 11-section feasibility report with varying market overview.',
            criteria: [
                { name: 'City', type: 'single', options: ['Dubai', 'Abu Dhabi', 'Riyadh', 'Jeddah'], required: true },
                { name: 'Asset Type', type: 'single', options: ['Residential', 'Office', 'Retail', 'Hotel'], required: true },
                { name: 'Category', type: 'single', options: ['Apartments', 'Villas', 'Townhouses', 'Grade A', 'Grade B', '3 Star', '4 Star', '5 Star', 'Community Mall', 'Regional Mall', 'Neighbourhood Center', 'Convenience Center', 'Small Regional Mall'], required: true },
                { name: 'Specifications', type: 'single', options: ['Luxury', 'High End', 'Upper Mid End', 'Mid End', 'Affordable', 'Low End', 'Social', 'Business Park', 'High Rise', 'Mid Rise', 'Low Rise', 'Beach Resort', 'Business', 'City', 'Leisure'], required: true }
            ],
            sections: [
                { name: 'Cover Page', order: 1, isVarying: false, folderPath: '01_Cover Page', filename: 'cover.pptx' },
                { name: 'Table of Contents', order: 2, isVarying: false, folderPath: '02_Table of Contents', filename: 'toc.pptx' },
                { name: 'Project Background', order: 3, isVarying: false, folderPath: '03_Project Background', filename: 'project_background.pptx' },
                { name: 'Executive Summary', order: 4, isVarying: false, folderPath: '04_Executive Summary', filename: 'executive_summary.pptx' },
                { name: 'Site Assessment', order: 5, isVarying: false, folderPath: '05_Site Assessment', filename: 'site_assessment.pptx' },
                { name: 'Market Overview', order: 6, isVarying: true, folderPath: '06_Market Overview', varyingCriteria: ['City', 'Asset Type', 'Category', 'Specifications'] },
                { name: 'Development Recommendations Part 1', order: 7, isVarying: false, folderPath: '07_Development Recommendations Part 1', filename: 'development recommendations PART 1.pptx' },
                { name: 'Development Recommendations Part 2', order: 8, isVarying: true, folderPath: '08_Development Recommendations Part 2', varyingCriteria: ['City', 'Asset Type', 'Category', 'Specifications'] },
                { name: 'Development Recommendations Part 3', order: 9, isVarying: false, folderPath: '09_Development Recommendations Part 3', filename: 'development recommendations PART 3.pptx' },
                { name: 'Financial & Investment Analysis', order: 10, isVarying: false, folderPath: '10_Financial & Investment Analysis', filename: 'financial and investment analysis.pptx' },
                { name: 'Disclaimer', order: 11, isVarying: false, folderPath: '11_Disclaimer', filename: 'disclaimer.pptx' }
            ],
            enablePlots: true,
            isActive: true
        };

        // 3. SEED CREDENTIAL REPORT
        const credentialReport = {
            name: 'Credential Report',
            description: 'Company credentials and project overview.',
            criteria: [
                { name: 'Department', type: 'single', options: ['Hospitality', 'Real Estate', 'Consultancy'], required: true }
            ],
            sections: [
                { name: 'Company Overview', order: 1, isVarying: false, folderPath: 'Company Overview', filename: 'overview.pptx' }
            ],
            enablePlots: false,
            isActive: true
        };

        await PresentationType.create([feasibilityStudy, credentialReport]);
        console.log('Seeded 2 PresentationTypes successfully.');

        await mongoose.disconnect();
        console.log('DONE.');
    } catch (error) {
        console.error('SEEDING FAILED:', error);
        process.exit(1);
    }
};

seed();
