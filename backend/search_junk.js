import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

const query = 'hhhahah';
const libRoot = './Library/Feasibility Study';

const search = (dir) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            search(fullPath);
        } else if (item.endsWith('.pptx')) {
            try {
                const data = fs.readFileSync(fullPath);
                const zip = new PizZip(data);
                const slides = Object.keys(zip.files).filter(f => f.startsWith('ppt/slides/slide'));
                for (const slide of slides) {
                    const xml = zip.file(slide).asText();
                    if (xml.toLowerCase().includes(query.toLowerCase())) {
                        console.log(`FOUND "${query}" in: ${fullPath} (${slide})`);
                    }
                }
            } catch (e) {
                // skip
            }
        }
    }
}

search(libRoot);
