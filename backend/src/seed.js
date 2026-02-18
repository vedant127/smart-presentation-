import dotenv from 'dotenv';
import connectDatabase from './config/database.js';
import PresentationType from './models/PresentationType.js';
import User from './models/User.js';

dotenv.config();

/**
 * Database Seeder
 * Seeds the database with initial data
 */

const seedData = async () => {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Connect to database
        await connectDatabase();

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await PresentationType.deleteMany({});
        await User.deleteMany({});

        // Create admin user
        console.log('👤 Creating admin user...');
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@smartpresentation.com',
            password: 'admin123',
            role: 'admin'
        });
        console.log('✅ Admin user created');

        // Create Feasibility Study presentation type
        console.log('\n📊 Creating Feasibility Study presentation type...');

        const feasibilityStudy = await PresentationType.create({
            name: 'Feasibility Study',
            description: 'Comprehensive feasibility study presentation with market analysis',
            enablePlots: true,
            criteria: [
                {
                    name: 'City',
                    type: 'single',
                    options: ['Dubai', 'Abu Dhabi', 'Riyadh', 'Jeddah'],
                    required: true
                },
                {
                    name: 'Asset Type',
                    type: 'single',
                    options: ['Residential', 'Office', 'Retail', 'Hotel'],
                    required: true
                },
                {
                    name: 'Category',
                    type: 'single',
                    options: ['Apartments', 'Villas', 'Townhouses', 'Grade A', 'Grade B', '3 Star', '4 Star', '5 Star', 'Community Mall', 'Regional Mall', 'Neighbourhood Center', 'Convenience Center', 'Small Regional Mall'],
                    required: true
                },
                {
                    name: 'Specifications',
                    type: 'single',
                    options: ['Luxury', 'High End', 'Upper Mid End', 'Mid End', 'Affordable', 'Low End', 'Social', 'Business Park', 'High Rise', 'Mid Rise', 'Low Rise', 'Beach Resort', 'Business', 'City', 'Leisure'],
                    required: true
                }
            ],
            sections: [
                {
                    name: 'Cover Page',
                    order: 1,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '01_Cover Page',
                    filename: 'cover.pptx'
                },
                {
                    name: 'Table of Contents',
                    order: 2,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '02_Table of Contents',
                    filename: 'toc.pptx'
                },
                {
                    name: 'Project Background',
                    order: 3,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '03_Project Background',
                    filename: 'project_background.pptx'
                },
                {
                    name: 'Executive Summary',
                    order: 4,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '04_Executive Summary',
                    filename: 'executive_summary.pptx'
                },
                {
                    name: 'Site Assessment',
                    order: 5,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '05_Site Assessment',
                    filename: 'site_assessment.pptx'
                },
                {
                    name: 'Market Overview',
                    order: 6,
                    isVarying: true,
                    varyingCriteria: ['City', 'Asset Type', 'Category', 'Specifications'],
                    folderPath: '06_Market Overview',
                    filename: null
                },
                {
                    name: 'Development Recommendations Part 1',
                    order: 7,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '07_Development Recommendations Part 1',
                    filename: null
                },
                {
                    name: 'Development Recommendations Part 2',
                    order: 8,
                    isVarying: true,
                    varyingCriteria: ['City', 'Asset Type', 'Category', 'Specifications'],
                    folderPath: '08_Development Recommendations Part 2',
                    filename: null
                },
                {
                    name: 'Development Recommendations Part 3',
                    order: 9,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '09_Development Recommendations Part 3',
                    filename: null
                },
                {
                    name: 'Financial & Investment Analysis',
                    order: 10,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '10_Financial & Investment Analysis',
                    filename: null
                },
                {
                    name: 'Disclaimer',
                    order: 11,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '11_Disclaimer',
                    filename: 'disclaimer.pptx'
                }
            ],
            createdBy: admin._id,
            isActive: true
        });

        console.log('✅ Feasibility Study created');

        console.log('✅ Feasibility Study created');

        console.log('\n📊 Creating Credential Report presentation type...');
        await PresentationType.create({
            name: 'Credential Report',
            description: 'Company credentials and track record',
            enablePlots: false, // Usually credential reports are general or about the company, not specific plots
            criteria: [
                { name: 'Target Market', type: 'single', options: ['KSA', 'UAE', 'Qatar'], required: true },
                { name: 'Sector', type: 'single', options: ['Real Estate', 'Hospitality', 'Infrastructure'], required: true }
            ],
            sections: [
                { name: 'Company Overview', order: 1, isVarying: false },
                { name: 'Our Team', order: 2, isVarying: false },
                { name: 'Track Record', order: 3, isVarying: false },
                { name: 'Case Studies', order: 4, isVarying: true, varyingCriteria: ['Sector'] }, // Example of varying content
                { name: 'Client List', order: 5, isVarying: false },
                { name: 'Contact Us', order: 6, isVarying: false }
            ],
            createdBy: admin._id,
            isActive: true
        });
        console.log('Credential Report created');

        console.log('Feasibility Study created');

        console.log('\nDatabase seeding completed successfully!\n');
        console.log('Admin Credentials:');
        console.log('Email: admin@smartpresentation.com');
        console.log('   Password: admin123\n');

        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
