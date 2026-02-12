import PresentationTemplate from '../models/PresentationTemplate.js';
import LibraryItem from '../models/LibraryItem.js';

/**
 * @route   GET /api/templates
 * @desc    Get all templates (can filter by city/asset)
 * @access  Private
 */
export const getTemplates = async (req, res, next) => {
    try {
        const { city, assetType } = req.query;
        let query = {};

        if (city) query.city = city;
        if (assetType) query.assetType = assetType;

        const templates = await PresentationTemplate.find(query)
            .populate('slides.libraryItemId', 'name path type')
            .sort({ city: 1, assetType: 1 });

        res.status(200).json({
            success: true,
            count: templates.length,
            data: templates
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/templates
 * @desc    Create a new presentation template
 * @access  Private
 */
export const createTemplate = async (req, res, next) => {
    try {
        const { city, assetType, description, slides } = req.body;

        // Validation
        if (!city || !assetType) {
            return res.status(400).json({
                success: false,
                message: 'City and Asset Type are required'
            });
        }

        // Check for existing
        const existing = await PresentationTemplate.findOne({ city, assetType });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Template for ${city} - ${assetType} already exists`
            });
        }

        // --- SMART LOOKUP: Resolve LibraryItem IDs from Paths ---
        if (slides && Array.isArray(slides)) {
            const mongoose = await import('mongoose');

            for (let i = 0; i < slides.length; i++) {
                const slide = slides[i];
                let resolvedId = null;

                // Case A: User provided a valid ObjectId
                if (slide.libraryItemId && mongoose.default.isValidObjectId(slide.libraryItemId)) {
                    continue;
                }

                // Case B: User provided a path string in 'libraryItemId' or 'path' field
                const lookupPath = slide.path || slide.libraryItemId;

                if (lookupPath && typeof lookupPath === 'string') {
                    // Try to find the file in LibraryItem collection
                    // We try exact path match first
                    let item = await LibraryItem.findOne({
                        path: lookupPath.replace(/\\/g, '/') // Ensure forward slashes
                    });

                    // If not found, try fuzzy search by Name
                    if (!item) {
                        item = await LibraryItem.findOne({
                            name: lookupPath,
                            type: 'file'
                        });
                    }

                    if (item) {
                        slide.libraryItemId = item._id; // Replace with valid ID
                        resolvedId = item._id;
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: `Library Item not found: "${lookupPath}". Please ensure the file exists in the Library and you have run /api/library/scan.`
                        });
                    }
                } else {
                    return res.status(400).json({
                        success: false,
                        message: `Slide #${i + 1} (${slide.sectionName}) missing valid 'libraryItemId' or 'path'.`
                    });
                }
            }
        }

        const template = await PresentationTemplate.create({
            city,
            assetType,
            description,
            slides: slides || []
        });

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: template
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/templates/:id
 * @desc    Get single template
 * @access  Private
 */
export const getTemplate = async (req, res, next) => {
    try {
        const template = await PresentationTemplate.findById(req.params.id)
            .populate('slides.libraryItemId');

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.status(200).json({
            success: true,
            data: template
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/templates/:id
 * @desc    Update template
 * @access  Private
 */
export const updateTemplate = async (req, res, next) => {
    try {
        const template = await PresentationTemplate.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('slides.libraryItemId');

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Template updated successfully',
            data: template
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/templates/:id
 * @desc    Delete template
 * @access  Private
 */
export const deleteTemplate = async (req, res, next) => {
    try {
        const template = await PresentationTemplate.findByIdAndDelete(req.params.id);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Template deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/templates/match
 * @desc    Find the best matching template for inputs
 * @access  Private
 */
export const matchTemplate = async (req, res, next) => {
    try {
        const { city, assetType } = req.body;

        if (!city || !assetType) {
            return res.status(400).json({
                success: false,
                message: 'City and Asset Type are required for matching'
            });
        }

        // Exact match
        let template = await PresentationTemplate.findOne({
            city: { $regex: new RegExp(`^${city}$`, 'i') },
            assetType: { $regex: new RegExp(`^${assetType}$`, 'i') }
        }).populate('slides.libraryItemId');

        if (template) {
            return res.status(200).json({
                success: true,
                matchType: 'exact',
                data: template
            });
        }

        // Fallback: Default for Asset Type (any city)
        // OR Default for City (any asset) - Implementation policy decision
        // For now, return 404 if no exact match, user can implement fuzzy logic here

        return res.status(404).json({
            success: false,
            message: `No template found for ${city} - ${assetType}`
        });

    } catch (error) {
        next(error);
    }
};
