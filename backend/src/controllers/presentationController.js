import PresentationType from '../models/PresentationType.js';
import PresentationHistory from '../models/PresentationHistory.js';
import PresentationTemplate from '../models/PresentationTemplate.js';
import { generatePresentation, generatePresentationFromTemplate, assemblePresentation } from '../services/presentationService.js';
import { selectSlides } from '../services/slideSelectionService.js';


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

/**
 * @route   POST /api/presentations/generate-selection
 * @desc    Select appropriate slides based on user input
 * @access  Private
 */
const generateSelection = async (req, res, next) => {
    try {
        // STEP 1: Get user input from frontend form
        const {
            city,              // "Mumbai"
            projectType,       // "Residential"
            requirements,      // ["Financial Analysis", "Market Analysis"]
            companyName,
            projectTitle
        } = req.body;

        console.log('User requested presentation for:', {
            city,
            projectType,
            requirements
        });

        // STEP 2: Select appropriate slides
        const selectedSlides = selectSlides(city, requirements, projectType);

        console.log(`Selected ${selectedSlides.length} slides:`,
            selectedSlides.map(s => s.title)
        );

        // STEP 3: Return the selection
        res.json({
            success: true,
            selectedSlides: selectedSlides,
            totalSlides: selectedSlides.length
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
    deleteHistory,
    createAndDownload,
    generateSelection,

};

// createPro removed as requested


/**
 * @route   POST /api/presentations/create-download
 * @desc    Generate and immediately download presentation
 * @access  Private
 */
const createAndDownload = async (req, res, next) => {
    try {
        const { presentationTypeId, formData, plots } = req.body;

        // Validate required fields
        if (!presentationTypeId || !formData) {
            return res.status(400).json({
                success: false,
                message: 'Presentation type ID and form data are required'
            });
        }

        const presentationType = await PresentationType.findById(presentationTypeId);

        if (!presentationType) {
            return res.status(404).json({
                success: false,
                message: 'Presentation type not found'
            });
        }

        // For public access, use a dummy Guest ID
        const guestId = '000000000000000000000000';
        const userId = req.user ? req.user._id : guestId;

        // THE SYSTEM: Spotify-like "Playlist" Assembly
        // If the type has defined sections, we use the Assembly Engine.
        // This works for both Multi-Plot (List of Songs) and Single-Context project types.
        if (presentationType.sections && presentationType.sections.length > 0) {
            console.log(`🏭 Starting System Assembly for ${presentationType.name}`);

            const result = await assemblePresentation({
                presentationType,
                formData,
                plots: plots || [], // Pass empty array if null, engine handles it as single context
                userId
            });

            // History Tracking
            try {
                await PresentationHistory.create({
                    user: userId,
                    presentationType: presentationType._id,
                    presentationTypeName: `${presentationType.name} (Assembly)`,
                    formData,
                    plots: plots || [],
                    generatedFileName: result.fileName,
                    filePath: result.filePath,
                    status: 'completed'
                });
            } catch (hErr) { console.warn("History skipped:", hErr.message); }

            return res.download(result.filePath, result.fileName);
        }

        // --- OLD MATCHING ENGINE (Fallback for non-plot types) ---
        // 1. Try to find a specific template for this City + Asset Type
        // ... existing logic ...
        const city = formData.city || "Mumbai"; // Default fallback
        const projectType = formData.assetType || formData.projectType || "Residential";

        const template = await PresentationTemplate.findOne({
            city: { $regex: new RegExp(`^${city}$`, 'i') },
            assetType: { $regex: new RegExp(`^${projectType}$`, 'i') }
        }).populate('slides.libraryItemId');

        if (template) {
            const result = await generatePresentationFromTemplate({
                template,
                formData,
                userId
            });
            return res.download(result.filePath, result.fileName);
        }

        // If no template matched and no plots, maybe regular generation?
        // Fallback to old service
        const result = await generatePresentation({
            presentationType,
            formData,
            plots: [],
            userId
        });
        res.download(result.filePath, result.fileName);

    } catch (error) {
        console.error('\n[CreateDownload] ERROR:', error.message);
        console.error('Stack:', error.stack);
        next(error);
    }
};
