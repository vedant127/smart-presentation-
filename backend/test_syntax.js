import { Automizer } from 'pptx-automizer';
import fs from 'fs';
import path from 'path';

const test = async () => {
    const automizer = new Automizer({
        templateDir: '.',
        outputDir: './generated',
        removeExistingSlides: true
    });

    automizer.loadRoot('Library/RootTemplate.pptx');
    automizer.load('Library/Feasibility Study/01_Cover_Page/cover.pptx', 'cover');

    automizer.addSlide('cover', 1).modify({
        tag: 'a:t',
        callback: (element) => {
            console.log('TAG HIT:', element.textContent);
            element.textContent = 'TAG_REPLACEMENT';
        }
    });

    await automizer.write('test_syntax.pptx');
    console.log('DONE');
};

test();
