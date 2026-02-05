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
                    options: ['Riyadh', 'Dubai', 'Abu Dhabi', 'Jeddah', 'Doha'],
                    required: true
                },
                {
                    name: 'Asset Type',
                    type: 'single',
                    options: ['Residential', 'Hotels', 'Office', 'Retail'],
                    required: true
                },
                {
                    name: 'Category',
                    type: 'single',
                    options: ['Apartments', 'Villas', 'Grade A', 'Grade B', 'High Rise', 'Low Rise'],
                    required: true
                },
                {
                    name: 'Specifications',
                    type: 'single',
                    options: ['Luxury', 'Mid-Range', 'Budget', 'Premium'],
                    required: true
                }
            ],
            sections: [
                {
                    name: 'Cover Page',
                    order: 1,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '01_Cover Page'
                },
                {
                    name: 'Table of Contents',
                    order: 2,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '02_Table of Contents'
                },
                {
                    name: 'Project Background',
                    order: 3,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '03_Project Background'
                },
                {
                    name: 'Executive Summary',
                    order: 4,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '04_Executive Summary'
                },
                {
                    name: 'Site Assessment',
                    order: 5,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '05_Site Assessment'
                },
                {
                    name: 'Market Overview',
                    order: 6,
                    isVarying: true,
                    varyingCriteria: ['City', 'Asset Type', 'Category', 'Specifications'],
                    folderPath: '06_Market Overview'
                },
                {
                    name: 'Development Recommendations Part 1',
                    order: 7,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '07_Development Recommendations Part 1'
                },
                {
                    name: 'Development Recommendations Part 2',
                    order: 8,
                    isVarying: true,
                    varyingCriteria: ['City', 'Asset Type', 'Category', 'Specifications'],
                    folderPath: '08_Development Recommendations Part 2'
                },
                {
                    name: 'Development Recommendations Part 3',
                    order: 9,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '09_Development Recommendations Part 3'
                },
                {
                    name: 'Financial & Investment Analysis',
                    order: 10,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '10_Financial & Investment Analysis'
                },
                {
                    name: 'Disclaimer',
                    order: 11,
                    isVarying: false,
                    varyingCriteria: [],
                    folderPath: '11_Disclaimer'
                }
            ],
            createdBy: admin._id,
            isActive: true
        });

        console.log('✅ Feasibility Study created');

        console.log('\n📊 Creating Business Analysis presentation type...');
        await PresentationType.create({
            name: 'Business Analysis',
            description: 'Professional business analysis including market trends and strategy',
            enablePlots: false,
            criteria: [
                { name: 'Client Name', type: 'single', options: [], required: true },
                { name: 'Target Market', type: 'single', options: [], required: true }
            ],
            sections: [
                { name: 'Executive Summary', order: 1, isVarying: false },
                { name: 'Market Analysis', order: 2, isVarying: false },
                { name: 'Competitor Landscape', order: 3, isVarying: false },
                { name: 'Strategic Recommendations', order: 4, isVarying: false },
                { name: 'Financial Projections', order: 5, isVarying: false },
                { name: 'Next Steps', order: 6, isVarying: false }
            ],
            createdBy: admin._id,
            isActive: true
        });
        console.log('✅ Business Analysis created');

        console.log('✅ Feasibility Study created');

        console.log('\n✅ Database seeding completed successfully!\n');
        console.log('📝 Admin Credentials:');
        console.log('   Email: admin@smartpresentation.com');
        console.log('   Password: admin123\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
