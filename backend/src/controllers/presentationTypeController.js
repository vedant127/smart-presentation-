import PresentationType from '../models/PresentationType.js';

/**
 * Presentation Type Controller
 * Manages presentation type definitions (Admin UI - Part 2)
 */

/**
 * @route   POST /api/presentation-types
 * @desc    Create a new presentation type
 * @access  Private (Admin)
 */
const createPresentationType = async (req, res, next) => {
    try {
        const { name, description, criteria, sections, enablePlots } = req.body;

        const presentationType = await PresentationType.create({
            name,
            description,
            criteria,
            sections,
            enablePlots,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: 'Presentation type created successfully',
            data: { presentationType }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/presentation-types
 * @desc    Get all presentation types
 * @access  Public
 */
const getPresentationTypes = async (req, res, next) => {
    try {
        const { isActive } = req.query;

        const filter = {};
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const presentationTypes = await PresentationType.find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                presentationTypes,
                count: presentationTypes.length
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/presentation-types/:id
 * @desc    Get single presentation type
 * @access  Public
 */
const getPresentationType = async (req, res, next) => {
    try {
        const presentationType = await PresentationType.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!presentationType) {
            return res.status(404).json({
                success: false,
                message: 'Presentation type not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { presentationType }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/presentation-types/:id
 * @desc    Update presentation type
 * @access  Private (Admin)
 */
const updatePresentationType = async (req, res, next) => {
    try {
        const { name, description, criteria, sections, enablePlots, isActive } = req.body;

        const presentationType = await PresentationType.findById(req.params.id);

        if (!presentationType) {
            return res.status(404).json({
                success: false,
                message: 'Presentation type not found'
            });
        }

        if (name) presentationType.name = name;
        if (description !== undefined) presentationType.description = description;
        if (criteria) presentationType.criteria = criteria;
        if (sections) presentationType.sections = sections;
        if (enablePlots !== undefined) presentationType.enablePlots = enablePlots;
        if (isActive !== undefined) presentationType.isActive = isActive;

        await presentationType.save();

        res.status(200).json({
            success: true,
            message: 'Presentation type updated successfully',
            data: { presentationType }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/presentation-types/:id
 * @desc    Delete presentation type
 * @access  Private (Admin)
 */
const deletePresentationType = async (req, res, next) => {
    try {
        const presentationType = await PresentationType.findByIdAndDelete(req.params.id);

        if (!presentationType) {
            return res.status(404).json({
                success: false,
                message: 'Presentation type not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Presentation type deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/presentation-types/:id/form-schema
 * @desc    Get dynamic form schema for presentation type
 * @access  Public
 */
const getFormSchema = async (req, res, next) => {
    try {
        const presentationType = await PresentationType.findById(req.params.id);

        if (!presentationType) {
            return res.status(404).json({
                success: false,
                message: 'Presentation type not found'
            });
        }

        // Build form schema from criteria
        const formSchema = {
            presentationTypeId: presentationType._id,
            presentationTypeName: presentationType.name,
            enablePlots: presentationType.enablePlots,
            criteria: presentationType.criteria.map(c => ({
                name: c.name,
                type: c.type,
                options: c.options,
                required: c.required
            }))
        };

        res.status(200).json({
            success: true,
            data: { formSchema }
        });

    } catch (error) {
        next(error);
    }
};

export {
    createPresentationType,
    getPresentationTypes,
    getPresentationType,
    updatePresentationType,
    deletePresentationType,
    getFormSchema
};
