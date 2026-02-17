
import { Automizer } from 'pptx-automizer';
import path from 'path';

const run = async () => {
    try {
        console.log('Testing simple Automizer...');
        const automizer = new Automizer({
            templateDir: process.cwd(),
            outputDir: path.join(process.cwd(), 'generated'),
            removeExistingSlides: true
        });

        const rootPath = path.join(process.cwd(), 'Library', 'RootTemplate.pptx');
        console.log('Loading root from:', rootPath);

        const pres = automizer.loadRoot(rootPath);
        console.log('Root loaded object:', pres ? 'Yes' : 'No');

        await automizer.write(path.join(process.cwd(), 'generated', 'simple_test.pptx'));
        console.log('Simple test passed!');
    } catch (e) {
        console.error('Simple test failed:', e);
    }
}
run();
