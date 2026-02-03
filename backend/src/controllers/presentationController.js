import PresentationType from '../models/PresentationType.js';
import PresentationHistory from '../models/PresentationHistory.js';
import { generatePresentation } from '../services/presentationService.js';

/**
 * Presentation Generation Controller
 * Handles dynamic presentation generation based on form data
 */

/**
 * @route   POST /api/presentations/generate
 * @desc    Generate a presentation based on form data
 * @access  Private
 */
const generate = async (req, res, next) => {
    try {
        const { presentationTypeId, formData, plots } = req.body;

        // Validate required fields
        if (!presentationTypeId || !formData) {
            return res.status(400).json({
                success: false,
                message: 'Presentation type ID and form data are required'
            });
        }

        // Get presentation type
        const presentationType = await PresentationType.findById(presentationTypeId);

        if (!presentationType) {
            return res.status(404).json({
                success: false,
                message: 'Presentation type not found'
            });
        }

        if (!presentationType.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Presentation type is inactive'
            });
        }

        // Validate plots if required
        if (presentationType.enablePlots && (!plots || plots.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Plots are required for this presentation type'
            });
        }

        // Generate presentation
        const result = await generatePresentation({
            presentationType,
            formData,
            plots: plots || [],
            userId: req.user._id
        });

        // Save to history
        const history = await PresentationHistory.create({
            user: req.user._id,
            presentationType: presentationType._id,
            presentationTypeName: presentationType.name,
            formData,
            plots: plots || [],
            generatedFileName: result.fileName,
            filePath: result.filePath,
            fileSize: result.fileSize,
            status: 'completed'
        });

        res.status(200).json({
            success: true,
            message: 'Presentation generated successfully',
            data: {
                presentation: {
                    id: history._id,
                    fileName: result.fileName,
                    filePath: result.filePath,
                    fileSize: result.fileSize,
                    downloadUrl: `/api/presentations/download/${history._id}`
                }
            }
        });

    } catch (error) {
        console.error('Presentation generation error:', error);

        // Save failed attempt to history
        if (req.body.presentationTypeId) {
            await PresentationHistory.create({
                user: req.user._id,
                presentationType: req.body.presentationTypeId,
                presentationTypeName: 'Unknown',
                formData: req.body.formData || {},
                plots: req.body.plots || [],
                generatedFileName: 'failed',
                filePath: 'failed',
                status: 'failed',
                error: error.message
            }).catch(() => { });
        }

        next(error);
    }
};

/**
 * @route   GET /api/presentations/history
 * @desc    Get user's presentation history
 * @access  Private
 */
const getHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const filter = { user: req.user._id };
        if (status) {
            filter.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [presentations, total] = await Promise.all([
            PresentationHistory.find(filter)
                .populate('presentationType', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            PresentationHistory.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: {
                presentations,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/presentations/history/:id
 * @desc    Get single presentation from history
 * @access  Private
 */
const getHistoryItem = async (req, res, next) => {
    try {
        const presentation = await PresentationHistory.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('presentationType', 'name description');

        if (!presentation) {
            return res.status(404).json({
                success: false,
                message: 'Presentation not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { presentation }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/presentations/download/:id
 * @desc    Download generated presentation
 * @access  Private
 */
const download = async (req, res, next) => {
    try {
        const presentation = await PresentationHistory.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!presentation) {
            return res.status(404).json({
                success: false,
                message: 'Presentation not found'
            });
        }

        if (presentation.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Presentation is not ready for download'
            });
        }

        // Check if file exists
        const fs = await import('fs');
        const path = await import('path');

        const filePath = path.resolve(presentation.filePath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Presentation file not found'
            });
        }

        // Increment download count
        await presentation.incrementDownload();

        // Send file
        res.download(filePath, presentation.generatedFileName, (err) => {
            if (err) {
                console.error('Download error:', err);
                next(err);
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/presentations/history/:id
 * @desc    Delete presentation from history
 * @access  Private
 */
const deleteHistory = async (req, res, next) => {
    try {
        const presentation = await PresentationHistory.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!presentation) {
            return res.status(404).json({
                success: false,
                message: 'Presentation not found'
            });
        }

        // Delete file if exists
        const fs = await import('fs');
        const path = await import('path');

        const filePath = path.resolve(presentation.filePath);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.status(200).json({
            success: true,
            message: 'Presentation deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

export {
    generate,
    getHistory,
    getHistoryItem,
    download,
    deleteHistory
};
