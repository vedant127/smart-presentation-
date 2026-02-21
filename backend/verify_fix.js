
import fs from 'fs';
import PizZip from 'pizzip';
import path from 'path';

const generatedDir = './generated';
const files = fs.readdirSync(generatedDir).filter(f => f.endsWith('.pptx')).map(f => ({
    name: f,
    time: fs.statSync(path.join(generatedDir, f)).mtime.getTime()
})).sort((a, b) => b.time - a.time);

const filePath = path.join(generatedDir, files[0].name);
console.log('CHECKING:', filePath);

const data = fs.readFileSync(filePath);
const zip = new PizZip(data);
const slides = Object.keys(zip.files).filter(f => f.startsWith('ppt/slides/slide'));
let found = false;
for (const slide of slides) {
    const xml = zip.file(slide).asText();
    if (xml.toLowerCase().includes('hhhahah')) {
        console.log(`STILL FOUND "hhhahah" in: ${slide}`);
        found = true;
    }
}
if (!found) console.log('CLEAN! No junk found.');
