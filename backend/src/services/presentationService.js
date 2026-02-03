import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * PowerPoint Merging Service
 * Handles merging of multiple PPTX files into one presentation
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIBRARY_PATH = path.join(process.cwd(), 'Library');
const GENERATED_PATH = path.join(process.cwd(), 'generated');

// Ensure generated directory exists
if (!fs.existsSync(GENERATED_PATH)) {
    fs.mkdirSync(GENERATED_PATH, { recursive: true });
}

/**
 * Build file key from criteria values
 * Example: { city: 'Riyadh', assetType: 'Residential' } => 'riyadh + residential'
 */
const buildFileKey = (criteriaValues) => {
    return Object.values(criteriaValues)
        .map(val => String(val).toLowerCase().trim())
        .join(' + ');
};

/**
 * Find PPTX file in section folder
 */
const findPptxFile = (sectionPath, fileKey) => {
    try {
        if (!fs.existsSync(sectionPath)) {
            console.warn(`Section path not found: ${sectionPath}`);
            return null;
        }

        const files = fs.readdirSync(sectionPath);

        // Look for exact match
        const exactMatch = files.find(file => {
            const nameWithoutExt = path.basename(file, path.extname(file)).toLowerCase();
            return nameWithoutExt === fileKey && path.extname(file).toLowerCase() === '.pptx';
        });

        if (exactMatch) {
            return path.join(sectionPath, exactMatch);
        }

        return null;
    } catch (error) {
        console.error(`Error finding PPTX file: ${error.message}`);
        return null;
    }
};

/**
 * Get slides from PPTX file
 * Note: This is a simplified version. For production, use a proper PPTX parser
 */
const getSlidesFromPptx = async (filePath) => {
    try {
        // For now, we'll return the file path
        // In production, you'd use a library like 'pptxgenjs' or 'officegen' to extract slides
        return {
            filePath,
            slideCount: 1 // Placeholder
        };
    } catch (error) {
        console.error(`Error reading PPTX: ${error.message}`);
        return null;
    }
};

/**
 * Merge multiple PPTX files into one
 */
const mergePptxFiles = async (filePaths, outputFileName) => {
    try {
        // For a simple implementation, we'll copy the first file
        // In production, use a proper PPTX merging library

        if (filePaths.length === 0) {
            throw new Error('No files to merge');
        }

        const outputPath = path.join(GENERATED_PATH, outputFileName);

        // Simple approach: copy first file as base
        // In production, properly merge all slides
        if (filePaths.length === 1) {
            fs.copyFileSync(filePaths[0], outputPath);
        } else {
            // For multiple files, you'd need a proper PPTX merging library
            // For now, we'll copy the first file as a placeholder
            fs.copyFileSync(filePaths[0], outputPath);
            console.warn('Multiple file merging not fully implemented. Using first file only.');
        }

        const stats = fs.statSync(outputPath);

        return {
            filePath: outputPath,
            fileName: outputFileName,
            fileSize: stats.size
        };

    } catch (error) {
        console.error(`Error merging PPTX files: ${error.message}`);
        throw error;
    }
};

/**
 * Generate presentation based on form data and presentation type
 */
const generatePresentation = async ({ presentationType, formData, plots, userId }) => {
    try {
        const filesToMerge = [];
        const processedKeys = new Set(); // For deduplication

        // Process each section
        for (const section of presentationType.sections.sort((a, b) => a.order - b.order)) {
            const sectionPath = path.join(
                LIBRARY_PATH,
                presentationType.name,
                section.folderPath || section.name
            );

            if (!section.isVarying) {
                // UNVARYING SECTION - fetch single file
                const files = fs.existsSync(sectionPath) ? fs.readdirSync(sectionPath) : [];
                const pptxFile = files.find(f => path.extname(f).toLowerCase() === '.pptx');

                if (pptxFile) {
                    const filePath = path.join(sectionPath, pptxFile);
                    filesToMerge.push(filePath);
                    console.log(`✓ Added unvarying section: ${section.name}`);
                } else {
                    console.warn(`⚠ No PPTX found for unvarying section: ${section.name}`);
                }

            } else {
                // VARYING SECTION - fetch based on criteria

                if (presentationType.enablePlots && plots.length > 0) {
                    // Process each plot
                    for (const plot of plots) {
                        // Build criteria values from plot
                        const criteriaValues = {};

                        for (const criterionName of section.varyingCriteria) {
                            if (plot.criteria && plot.criteria[criterionName]) {
                                criteriaValues[criterionName] = plot.criteria[criterionName];
                            }
                        }

                        const fileKey = buildFileKey(criteriaValues);

                        // Check for duplicates
                        if (processedKeys.has(fileKey)) {
                            console.log(`⊗ Skipping duplicate: ${fileKey}`);
                            continue;
                        }

                        const filePath = findPptxFile(sectionPath, fileKey);

                        if (filePath) {
                            filesToMerge.push(filePath);
                            processedKeys.add(fileKey);
                            console.log(`✓ Added varying section: ${section.name} - ${fileKey}`);
                        } else {
                            console.warn(`⚠ No PPTX found for: ${section.name} - ${fileKey}`);
                        }
                    }

                } else {
                    // No plots - use global form data
                    const criteriaValues = {};

                    for (const criterionName of section.varyingCriteria) {
                        if (formData[criterionName]) {
                            criteriaValues[criterionName] = formData[criterionName];
                        }
                    }

                    const fileKey = buildFileKey(criteriaValues);
                    const filePath = findPptxFile(sectionPath, fileKey);

                    if (filePath) {
                        filesToMerge.push(filePath);
                        console.log(`✓ Added varying section: ${section.name} - ${fileKey}`);
                    } else {
                        console.warn(`⚠ No PPTX found for: ${section.name} - ${fileKey}`);
                    }
                }
            }
        }

        if (filesToMerge.length === 0) {
            throw new Error('No presentation files found to merge');
        }

        // Generate output filename
        const timestamp = Date.now();
        const outputFileName = `${presentationType.name.replace(/\s+/g, '_')}_${timestamp}.pptx`;

        // Merge files
        const result = await mergePptxFiles(filesToMerge, outputFileName);

        console.log(`✅ Presentation generated: ${outputFileName}`);

        return result;

    } catch (error) {
        console.error(`Presentation generation failed: ${error.message}`);
        throw error;
    }
};

export {
    generatePresentation,
    mergePptxFiles,
    buildFileKey
};
