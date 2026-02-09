import PresentationType from '../models/PresentationType.js';
import PresentationHistory from '../models/PresentationHistory.js';
import { generatePresentation } from '../services/presentationService.js';
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

        // --- NEW: SLIDE SELECTION INTEGRATION ---
        // Extract criteria from the first plot (since we're generating one cohesive report)
        // or prioritize formData if available globally
        let selectedSlides = [];

        // Try getting criteria from plots[0] (the primary plot logic)
        const primaryPlot = (plots && plots.length > 0) ? plots[0] : null;
        const criteria = primaryPlot ? (primaryPlot.criteria || primaryPlot.data || {}) : formData;


        const city = criteria.city || formData.city || "Mumbai"; // Default fallback
        const projectType = criteria.assetType || criteria.projectType || formData.projectType || "Residential";

        // Requirements: map 'category' or explicit requirements array
        let requirements = formData.requirements || criteria.requirements || [];

        // Ensure requirements is an array
        if (!Array.isArray(requirements)) {
            requirements = [requirements];
        }

        // Add category if specified
        if (criteria.category && !requirements.includes(criteria.category)) {
            requirements.push(criteria.category);
        }
        if (formData.category && !requirements.includes(formData.category)) {
            requirements.push(formData.category);
        }

        console.log(`\n[CreateDownload] Slide Selection Parameters:`);
        console.log(`   City: ${city}`);
        console.log(`   Project Type: ${projectType}`);
        console.log(`   Requirements: ${JSON.stringify(requirements)}`);

        selectedSlides = selectSlides(city, requirements, projectType);

        // Generate presentation
        const result = await generatePresentation({
            presentationType,
            formData,
            plots: plots || [],
            userId: userId,
            selectedSlides // Pass the selected slides to the service
        });

        // Save to history (optional but good for tracking)
        // We use catch() to suppress errors if history creation fails for guests (e.g. foreign key constraints)
        try {
            await PresentationHistory.create({
                user: userId,
                presentationType: presentationType._id,
                presentationTypeName: presentationType.name,
                formData,
                plots: plots || [],
                generatedFileName: result.fileName,
                filePath: result.filePath,
                fileSize: result.fileSize,
                status: 'completed'
            });
        } catch (hErr) {
            console.warn("History tracking skipped for guest user:", hErr.message);
        }

        // Send file directly
        res.download(result.filePath, result.fileName);

    } catch (error) {
        console.error('\n[CreateDownload] ERROR:', error.message);
        console.error('Stack:', error.stack);
        next(error);
    }
};
