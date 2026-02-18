import { assemblePresentation } from './src/services/presentationServiceNew.js';
import fs from 'fs';

const presentationType = {
    name: 'Feasibility Study',
    sections: [
        { name: 'Cover Page', order: 1, isVarying: false, folderPath: '01_Cover Page', filename: 'cover.pptx' },
        { name: 'Table of Contents', order: 2, isVarying: false, folderPath: '02_Table of Contents', filename: 'toc.pptx' },
        { name: 'Project Background', order: 3, isVarying: false, folderPath: '03_Project Background', filename: 'project_background.pptx' },
        { name: 'Executive Summary', order: 4, isVarying: false, folderPath: '04_Executive Summary', filename: 'executive_summary.pptx' },
        { name: 'Site Assessment', order: 5, isVarying: false, folderPath: '05_Site Assessment', filename: 'site_assessment.pptx' },
        { name: 'Market Overview', order: 6, isVarying: true, folderPath: '06_Market Overview', varyingCriteria: ['City', 'Asset Type', 'Category', 'Specifications'] },
        { name: 'Development Recommendations Part 1', order: 7, isVarying: false, folderPath: '07_Development Recommendations Part 1', filename: null },
        { name: 'Development Recommendations Part 2', order: 8, isVarying: true, folderPath: '08_Development Recommendations Part 2', varyingCriteria: ['City', 'Asset Type', 'Category', 'Specifications'] },
        { name: 'Development Recommendations Part 3', order: 9, isVarying: false, folderPath: '09_Development Recommendations Part 3', filename: null },
        { name: 'Financial & Investment Analysis', order: 10, isVarying: false, folderPath: '10_Financial & Investment Analysis', filename: null },
        { name: 'Disclaimer', order: 11, isVarying: false, folderPath: '11_Disclaimer', filename: 'disclaimer.pptx' }
    ]
};

console.log('\n========== TEST: Multi-City (Dubai + Riyadh) ==========');
try {
    const result = await assemblePresentation({
        presentationType,
        formData: { title: 'Multi City Study', clientName: 'ACME Corp' },
        plots: [
            { criteria: { City: 'Dubai', 'Asset Type': 'Residential', Category: 'Apartments', Specifications: 'Luxury' } },
            { criteria: { City: 'Riyadh', 'Asset Type': 'Residential', Category: 'Villas', Specifications: 'High End' } },
            { criteria: { City: 'Dubai', 'Asset Type': 'Residential', Category: 'Apartments', Specifications: 'Luxury' } }, // duplicate - should be deduped
        ],
        userId: 'test'
    });

    const size = fs.statSync(result.filePath).size;
    console.log('\n=== RESULT ===');
    console.log('File   :', result.fileName);
    console.log('Size   :', (size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Slides :', result.slideCount);
    result.addedSections.forEach(s => console.log('  OK', s));
    if (result.skippedSections.length) {
        result.skippedSections.forEach(s => console.log('  SKIP', s));
    }
} catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
}
