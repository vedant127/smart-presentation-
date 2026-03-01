const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function resizePptx(filePath) {
    try {
        const data = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(data);
        const presXmlFile = zip.file('ppt/presentation.xml');

        if (presXmlFile) {
            let presXml = await presXmlFile.async('string');
            if (presXml.includes('<p:sldSz')) {
                // Resize to required dimensions (18288000x10287000)
                presXml = presXml.replace(/<p:sldSz\s+cx="\d+"\s+cy="\d+"/, '<p:sldSz cx="18288000" cy="10287000"');
                zip.file('ppt/presentation.xml', presXml);

                const outBuffer = await zip.generateAsync({ type: 'nodebuffer' });
                fs.writeFileSync(filePath, outBuffer);
                console.log(`Successfully resized: ${path.basename(filePath)}`);
            } else {
                console.log(`Could not find slide size tag in: ${path.basename(filePath)}`);
            }
        } else {
            console.log(`Could not read ppt/presentation.xml in: ${path.basename(filePath)}`);
        }
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
    }
}

async function start() {
    const baseDir = path.join(process.cwd(), 'Library', 'Feasibility Study');

    // We already generated the new ones with 20x11.25, but just to be safe, let's process all
    // of the .pptx files in the library
    async function traverse(dirPath) {
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                await traverse(fullPath);
            } else if (file.isFile() && file.name.endsWith('.pptx')) {
                await resizePptx(fullPath);
            }
        }
    }

    await traverse(baseDir);
    console.log("Finished resizing all Library PPTX files.");
}

start();
