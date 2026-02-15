import PresentationTemplate from '../models/PresentationTemplate.js';
import LibraryItem from '../models/LibraryItem.js';
import PresentationType from '../models/PresentationType.js';
import { findBestMatchFile } from '../utils/fileMatcher.js';
import path from 'path';
import fs from 'fs';

/**
 * @route   GET /api/templates
 * @desc    Get all templates
 * @access  Private
 */
export const getTemplates = async (req, res, next) => {
    try {
        const templates = await PresentationTemplate.find();
        res.status(200).json({ success: true, data: templates });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/templates
 * @desc    Create a new template
 * @access  Private
 */
export const createTemplate = async (req, res, next) => {
    try {
        const template = await PresentationTemplate.create(req.body);
        res.status(201).json({ success: true, data: template });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/templates/:id
 * @desc    Get a single template
 * @access  Private
 */
export const getTemplate = async (req, res, next) => {
    try {
        const template = await PresentationTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }
        res.status(200).json({ success: true, data: template });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/templates/:id
 * @desc    Update a template
 * @access  Private
 */
export const updateTemplate = async (req, res, next) => {
    try {
        const template = await PresentationTemplate.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }
        res.status(200).json({ success: true, data: template });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/templates/:id
 * @desc    Delete a template
 * @access  Private
 */
export const deleteTemplate = async (req, res, next) => {
    try {
        const template = await PresentationTemplate.findByIdAndDelete(req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/templates/match
 * @desc    Find the best matching template for inputs (Previewing the Assembly)
 * @access  Private
 */
export const matchTemplate = async (req, res, next) => {
    try {
        const { city, assetType, category, specifications } = req.body;

        if (!city || !assetType) {
            return res.status(400).json({
                success: false,
                message: 'City and Asset Type are required for matching'
            });
        }

        // 1. Get the Definition (Feasibility Study by default or from param)
        // In future, frontend could pass presentationTypeId. For now, default to "Feasibility Study"
        const presentationType = await PresentationType.findOne({ name: 'Feasibility Study' });

        if (!presentationType) {
            return res.status(404).json({
                success: false,
                message: 'Feasibility Study configuration not found in DB.'
            });
        }

        // 2. Prepare Context for Matching
        const context = {
            city: city,
            assetType: assetType,
            category: category || '',
            specifications: specifications || ''
        };

        const slides = [];

        // 3. Iterate Sections and Simulate Assembly
        let libraryRoot = path.join(process.cwd(), 'Library');
        if (!fs.existsSync(libraryRoot)) libraryRoot = path.join(process.cwd(), '..', 'Library');

        const sections = (presentationType.sections || []).sort((a, b) => a.order - b.order);

        for (const section of sections) {
            const typeFolderName = presentationType.name;
            const sectionFolderName = section.folderPath || section.name;
            const sectionDir = path.join(libraryRoot, typeFolderName, sectionFolderName);

            let matchFound = false;
            let matchedFile = null;

            if (fs.existsSync(sectionDir)) {
                if (!section.isVarying) {
                    // Static: Take first likely file
                    const files = fs.readdirSync(sectionDir).filter(f => f.endsWith('.pptx') && !f.startsWith('~$'));
                    if (files.length > 0) {
                        // Simple heuristic for static
                        let target = files.find(f => f.toLowerCase().includes('cover')) ||
                            files.find(f => f.toLowerCase().includes('toc')) ||
                            files[0];
                        matchedFile = target;
                        matchFound = true;
                    }
                } else {
                    // Varying: Use Smart Matcher
                    // Determine relevant criteria values
                    const relevantCriteriaNames = section.varyingCriteria && section.varyingCriteria.length > 0
                        ? section.varyingCriteria
                        : ['City', 'Asset Type', 'Category', 'Specifications'];

                    const searchTokens = relevantCriteriaNames.map(critName => {
                        const key = Object.keys(context).find(k => k.toLowerCase() === critName.toLowerCase());
                        return key ? context[key] : '';
                    }).filter(t => t);

                    if (searchTokens.length > 0) {
                        const fullPath = findBestMatchFile(sectionDir, searchTokens);
                        if (fullPath) {
                            matchedFile = path.basename(fullPath);
                            matchFound = true;
                        }
                    }
                }
            }

            // Add to response (even if missing, to show structure, or only if present?)
            // Frontend likely expects a list of slides found.
            if (matchFound) {
                slides.push({
                    sectionName: section.name,
                    libraryItemId: {
                        _id: 'simulated_id_' + section.order,
                        path: matchedFile, // Relative filename for display
                        name: matchedFile,
                        type: 'file'
                    }
                });
            } else {
                // Optional: Add a "Missing" entry so user knows? 
                // The user complained about "No matching data", implying they want to see what IS matched.
                // If we send nothing, it might look broken.
                // Let's send the structure but with null path if missing?
                // No, usually "Found 0 Slides" comes from empty array.
            }
        }

        return res.status(200).json({
            success: true,
            matchType: 'assembly_preview',
            data: {
                _id: presentationType._id,
                city,
                assetType,
                slides: slides
            }
        });

    } catch (error) {
        next(error);
    }
};
