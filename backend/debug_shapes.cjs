const fs = require('fs');
const PizZip = require('pizzip');
const path = require('path');

const filePath = path.join('Library', 'Feasibility Study', '01_Cover Page', 'cover.pptx');
if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    process.exit(1);
}

const data = fs.readFileSync(filePath);
const zip = new PizZip(data);
const slideXml = zip.file('ppt/slides/slide1.xml').asText();

const names = [];
const re = /name="([^"]+)"/g;
let match;
while ((match = re.exec(slideXml)) !== null) {
    names.push(match[1]);
}
console.log('Shape names found:', names);
