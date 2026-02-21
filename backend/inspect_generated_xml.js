
import fs from 'fs';
import PizZip from 'pizzip';

const filePath = './generated/TEST_FIX_8c75e2.pptx';
const data = fs.readFileSync(filePath);
const zip = new PizZip(data);
const xml = zip.file('ppt/slides/slide8.xml').asText();
const index = xml.indexOf('hhhahah');
console.log('XML Snippet:', xml.substring(index - 50, index + 150));
