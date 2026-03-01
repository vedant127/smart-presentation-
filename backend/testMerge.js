import fs from 'fs';
import path from 'path';
import assembleReportModule from './src/services/assembleReport.js';
const { mergePptxFiles } = assembleReportModule;

async function test() {
    console.log('--- TESTING PPTX MERGER ---');
    const file1 = path.resolve('Library/Feasibility Study/01_Cover Page/cover.pptx');
    const file2 = path.resolve('Library/Feasibility Study/02_Table of Contents/toc.pptx');

    try {
        if (!fs.existsSync(file1)) throw new Error('File 1 missing: ' + file1);
        if (!fs.existsSync(file2)) throw new Error('File 2 missing: ' + file2);

        const mergedBuffer = await mergePptxFiles([file1, file2]);

        if (!fs.existsSync('generated')) fs.mkdirSync('generated');
        const outputPath = path.resolve('generated/test_merged.pptx');
        fs.writeFileSync(outputPath, mergedBuffer);

        console.log(`Test passed! Merged file saved at: ${outputPath}`);
    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
