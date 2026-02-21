
import fs from 'fs';
import PizZip from 'pizzip';

const filePath = './Library/Feasibility Study/04_Executive_Summary/executive_summary.pptx';
const data = fs.readFileSync(filePath);
const zip = new PizZip(data);
const xml = zip.file('ppt/slides/slide2.xml').asText();

// Find the context around hhhahah
const index = xml.indexOf('hhha');
if (index !== -1) {
    console.log('XML Snippet:', xml.substring(index - 50, index + 150));
} else {
    console.log('Not found');
}
