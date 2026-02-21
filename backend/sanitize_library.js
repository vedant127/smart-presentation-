
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';

const junkList = [
    'hhhahah', ',,^kpkpkpk', 'J J J', 'huhuhu', 'jiji', 'Koko', 'juhiihi', 'jij', 'ijiji', 'ihji',
    'jijijijojoji', 'jijijijij', 'jjjjijij', 'jijijijijkjoi', 'iughiuhuhiuh', 'juihugredredtyugijijklo',
    'zrsetdyf', 'zrsedt', 'srdtryf', 'rsetdyfv', 'rcyvbhkj', 'dtryftuvgy', 'retdfytguyh', 'reztsrdtft',
    'rtdfyguy', 'ftgyh', 'ersdtf', 'zsedrtfyt', 'fyguh', 'gyrft', 'ghrftgyhu', 'fguyh', 'erdtfgy',
    'srdtrguyh', 'srdytug', 'dfgyhu', 'drftugy', 'kjhgf', 'ftgkhj', 'sydtkgu', 'gftrde', 'hbgftdtrufgyh',
    'gvfytiugyhj', 'bhjgvfrtd', 'vgtfuyihijkn', 'vfytiguh', 'fcdrtugy'
];

const cleanFile = (filePath) => {
    try {
        const data = fs.readFileSync(filePath);
        const zip = new PizZip(data);
        const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
        let changed = false;

        slideFiles.forEach(file => {
            let xml = zip.file(file).asText();
            let originalXml = xml;

            // Heal runs
            xml = xml.replace(/<\/a:t><\/a:r><a:r><a:rPr[^>]*\/><a:t[^>]*>/gi, '');
            xml = xml.replace(/<\/a:t><a:t[^>]*>/gi, '');

            // Remove junk
            junkList.forEach(junk => {
                const pattern = new RegExp(junk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                xml = xml.replace(pattern, '');
            });

            if (xml !== originalXml) {
                zip.file(file, xml);
                changed = true;
            }
        });

        if (changed) {
            const output = zip.generate({ type: 'nodebuffer' });
            fs.writeFileSync(filePath, output);
            return true;
        }
    } catch (e) {
        console.error(`Error cleaning ${filePath}: ${e.message}`);
    }
    return false;
};

const walkSync = (dir, filelist = []) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist);
        } else if (file.endsWith('.pptx')) {
            filelist.push(path.join(dir, file));
        }
    });
    return filelist;
};

const main = () => {
    const libraryPath = path.resolve(process.cwd(), 'Library');
    console.log(`Starting source cleanup in: ${libraryPath}`);
    const files = walkSync(libraryPath);
    let cleanedCount = 0;

    files.forEach(f => {
        if (cleanFile(f)) {
            cleanedCount++;
            console.log(`[CLEANED] ${path.relative(libraryPath, f)}`);
        }
    });

    console.log(`\nCleanup finished. ${cleanedCount} files were sanitized.`);
};

main();
