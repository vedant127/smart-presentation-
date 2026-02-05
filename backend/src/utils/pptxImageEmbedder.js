
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';

/**
 * Injects a cover image into Slide 1 of a PPTX file.
 * @param {string} pptxPath - Path to the PPTX file.
 * @param {string} imagePath - Path to the image file.
 * @param {string} outputPptxPath - Path to save the modified PPTX.
 */
export const injectCoverImage = async (pptxPath, imagePath, outputPptxPath) => {
    // 1. Read PPTX and Image
    const content = fs.readFileSync(pptxPath);
    const zip = new PizZip(content);
    const imgData = fs.readFileSync(imagePath);
    const imgExt = path.extname(imagePath).replace('.', ''); // e.g., 'jpeg' or 'png'
    const imgName = `cover_image.${imgExt}`;

    // 2. Add Image to zip
    zip.file(`ppt/media/${imgName}`, imgData);

    // 3. Update Relationships (ppt/slides/_rels/slide1.xml.rels)
    const relsPath = 'ppt/slides/_rels/slide1.xml.rels';
    let relsXml = zip.file(relsPath).asText();

    // Generate new rId
    // Simple parser to find max rId
    const idMatches = relsXml.match(/Id="rId(\d+)"/g);
    let maxId = 0;
    if (idMatches) {
        idMatches.forEach(m => {
            const id = parseInt(m.match(/Id="rId(\d+)"/)[1]);
            if (id > maxId) maxId = id;
        });
    }
    const newRId = `rId${maxId + 1}`;

    // Add Relationship
    // We insert before the closing </Relationships>
    const relationStr = `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imgName}"/>`;
    relsXml = relsXml.replace('</Relationships>', `${relationStr}</Relationships>`);
    zip.file(relsPath, relsXml);

    // 4. Injects <p:pic> into slide1.xml
    const slidePath = 'ppt/slides/slide1.xml';
    let slideXml = zip.file(slidePath).asText();

    // We want to insert as the first child of spTree to be in background
    // <p:spTree> ...children... </p:spTree>
    // Insert after <p:spTree> tag (and its properties if any, actually spTree usually has <p:nvGrpSpPr><p:grpSpPr> etc? 
    // Usually spTree starts directly inside <p:cSld>.
    // Let's find <p:spTree> start.
    const spTreeStart = slideXml.indexOf('<p:spTree>');
    if (spTreeStart === -1) throw new Error('Could not find spTree in slide1.xml');

    // We need to look for where the children start. Usually after <p:grpSpPr> (Group Shape Properties)
    // Safest is to append at the END of the tree? NO, typically order determines Z-order (last is on top).
    // To be strictly "Background", we want it FIRST.
    // However, if we put it before <p:nvGrpSpPr>, it might be invalid.
    // Structure: <p:spTree> <p:nvGrpSpPr>... <p:grpSpPr>... <p:sp>...</p:sp> </p:spTree>
    // We should insert after the Group Properties.
    // Let's regex for the end of <p:grpSpPr>.

    const grpSpPrEnd = slideXml.indexOf('</p:grpSpPr>');
    let insertPos = -1;

    if (grpSpPrEnd !== -1) {
        insertPos = grpSpPrEnd + '</p:grpSpPr>'.length;
    } else {
        // Fallback: after spTree opening
        insertPos = spTreeStart + '<p:spTree>'.length;
    }

    const picXml = `
    <p:pic>
        <p:nvPicPr>
            <p:cNvPr id="${10000 + maxId}" name="Cover Background"/>
            <p:cNvPicPr>
                <a:picLocks noChangeAspect="1"/>
            </p:cNvPicPr>
            <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
            <a:blip r:embed="${newRId}"/>
            <a:stretch>
                <a:fillRect/>
            </a:stretch>
        </p:blipFill>
        <p:spPr>
            <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="9144000" cy="6858000"/>
            </a:xfrm>
            <a:prstGeom prst="rect">
                <a:avLst/>
            </a:prstGeom>
        </p:spPr>
    </p:pic>
    `;

    // Insert
    const newSlideXml = slideXml.slice(0, insertPos) + picXml + slideXml.slice(insertPos);
    zip.file(slidePath, newSlideXml);

    // 5. Write file
    const buffer = zip.generate({ type: 'nodebuffer' });
    fs.writeFileSync(outputPptxPath, buffer);
    console.log(`✅ Cover Image Injected. Saved to: ${outputPptxPath}`);
    return outputPptxPath;
};
