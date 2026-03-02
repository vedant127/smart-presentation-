import PresentationType from '../models/PresentationType.js';
import PresentationHistory from '../models/PresentationHistory.js';
import { assemblePresentation } from '../services/presentationServiceEnhanced.js';


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
        console.log(`\n============== GENERATE REQUEST ==============`);
        console.log(JSON.stringify(req.body, null, 2));

        let { presentationTypeId, typeId, type, formData, plots } = req.body;
        // Alias support
        presentationTypeId = presentationTypeId || typeId || type;

        // Ensure formData exists
        formData = formData || {};

        // Normalize formData keys for consistency (Fix Bug 5)
        if (req.body.project_name) formData.projectTitle = req.body.project_name;
        if (req.body.title) formData.projectTitle = req.body.title;
        if (req.body.client_name) formData.clientName = req.body.client_name;

        // Validate required fields
        if (!presentationTypeId || !formData) {
            return res.status(400).json({
                success: false,
                message: 'Presentation type ID and form data are required'
            });
        }

        // Get presentation type (Smart Search)
        let presentationType;

        // 1. Try ID
        if (presentationTypeId && presentationTypeId.match(/^[0-9a-fA-F]{24}$/)) {
            try { presentationType = await PresentationType.findById(presentationTypeId); } catch (e) { }
        }

        // 2. Fallback: Search by Name (Feasibility Study) if missing
        if (!presentationType) {
            console.log(`⚠️ Presentation Type ID "${presentationTypeId}" not found. Searching by name...`);
            // Check form data for clues
            const formTitle = (formData.subtitle || formData.title || '').toLowerCase();

            if (formTitle.includes('feasibility')) {
                presentationType = await PresentationType.findOne({ name: 'Feasibility Study' });
            } else if (formTitle.includes('credential')) {
                presentationType = await PresentationType.findOne({ name: 'Credential Report' });
            } else {
                // Last ditch: Default to Feasibility Study
                presentationType = await PresentationType.findOne({ name: 'Feasibility Study' });
            }
        }

        if (!presentationType) {
            console.log("❌ CRITICAL: No Presentation Type found even after fallback search.");
            return res.status(404).json({
                success: false,
                message: 'Presentation type not found (checked ID and Name)'
            });
        }

        console.log(`✅ Using Presentation Type: "${presentationType.name}" (ID: ${presentationType._id})`);

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

        // Generate presentation (using NEW Assembly Engine)
        // Use guestId if no authentication
        const guestId = '000000000000000000000000';
        const userId = req.user ? req.user._id : guestId;

        console.log(`Starting System Assembly for ${presentationType.name} (via /generate)`);

        const result = await assemblePresentation({
            presentationType,
            formData,
            plots: plots || [],
            userId
        });

        // Get file size for history
        let fileSize = 0;
        try {
            const fs = await import('fs');
            if (fs.existsSync(result.filePath)) {
                fileSize = fs.statSync(result.filePath).size;
            }
        } catch (e) {
            console.warn("Could not calculate file size:", e);
        }

        // Save to history
        const history = await PresentationHistory.create({
            user: userId,
            presentationType: presentationType._id,
            presentationTypeName: presentationType.name,
            formData,
            plots: plots || [],
            generatedFileName: result.fileName,
            filePath: result.filePath,
            fileSize: fileSize,
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
                    fileSize: fileSize,
                    downloadUrl: `/api/presentations/download/${history._id}`
                }
            }
        });

    } catch (error) {
        console.error('Presentation generation error:', error);

        // Save failed attempt to history
        if (req.body.presentationTypeId) {
            const guestId = '000000000000000000000000';
            const userId = req.user ? req.user._id : guestId;

            await PresentationHistory.create({
                user: userId,
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

        const guestId = '000000000000000000000000';
        const userId = req.user ? req.user._id : guestId;

        const filter = { user: userId };
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
        const guestId = '000000000000000000000000';
        const userId = req.user ? req.user._id : guestId;

        const presentation = await PresentationHistory.findOne({
            _id: req.params.id,
            user: userId
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
        console.log(`\n Download Request for ID: ${req.params.id}`);

        // Find presentation by ID only (no user check for development)
        const presentation = await PresentationHistory.findById(req.params.id);

        console.log(`   Found presentation:`, presentation ? 'YES' : 'NO');

        if (!presentation) {
            console.log(` Presentation not found in database`);
            return res.status(404).json({
                success: false,
                message: 'Presentation not found'
            });
        }

        console.log(`   Status: ${presentation.status}`);
        console.log(`   File: ${presentation.generatedFileName}`);
        console.log(`   Path: ${presentation.filePath}`);

        if (presentation.status !== 'completed') {
            console.log(` Presentation not completed`);
            return res.status(400).json({
                success: false,
                message: 'Presentation is not ready for download'
            });
        }

        // Check if file exists
        const fs = await import('fs');
        const path = await import('path');

        const filePath = path.resolve(presentation.filePath);
        console.log(`   Resolved path: ${filePath}`);
        console.log(`   File exists:`, fs.existsSync(filePath) ? 'YES' : 'NO');

        if (!fs.existsSync(filePath)) {
            console.log(` File not found on disk`);
            return res.status(404).json({
                success: false,
                message: 'Presentation file not found'
            });
        }

        // Increment download count
        await presentation.incrementDownload();

        console.log(`  Starting download...`);

        // Send file
        res.download(filePath, presentation.generatedFileName, (err) => {
            if (err) {
                console.error('Download error:', err);
                next(err);
            } else {
                console.log(` Download completed successfully`);
            }
        });

    } catch (error) {
        console.error('Download endpoint error:', error);
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
        const guestId = '000000000000000000000000';
        const userId = req.user ? req.user._id : guestId;

        const presentation = await PresentationHistory.findOneAndDelete({
            _id: req.params.id,
            user: userId
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
        const { presentationTypeId, typeId, type, formData = {}, plots = [] } = req.body;
        const typeIdToUse = presentationTypeId || typeId || type;

        console.log('\n[GenerateSelection] Request received:', JSON.stringify(req.body, null, 2));

        // Find presentation type
        let presentationType;
        if (typeIdToUse && typeIdToUse.match(/^[0-9a-fA-F]{24}$/)) {
            try { presentationType = await PresentationType.findById(typeIdToUse); } catch (e) { }
        }
        if (!presentationType) {
            presentationType = await PresentationType.findOne({ name: 'Feasibility Study' });
        }

        if (!presentationType) {
            return res.status(404).json({ success: false, message: 'Presentation type not found' });
        }

        // Generate using the assembly engine (template-only, no AI)
        const guestId = '000000000000000000000000';
        const userId = req.user ? req.user._id : guestId;

        const result = await assemblePresentation({
            presentationType,
            formData,
            plots: plots || [],
            userId
        });

        // Return generated file info
        res.json({
            success: true,
            message: 'Presentation generated from templates',
            data: {
                fileName: result.fileName,
                filePath: result.filePath,
                slideCount: result.slideCount || 0,
                fileSize: result.fileSize || 0
            }
        });

    } catch (error) {
        console.error('[GenerateSelection] Error:', error.message);
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
        let { presentationTypeId, typeId, type, formData, plots } = req.body;
        // Alias support
        presentationTypeId = presentationTypeId || typeId || type;

        // Ensure formData exists
        formData = formData || {};

        // Normalize formData keys for consistency
        if (req.body.project_name) formData.projectTitle = req.body.project_name;
        if (req.body.client_name) formData.clientName = req.body.client_name;

        // Validate required fields
        if (!presentationTypeId) {
            return res.status(400).json({
                success: false,
                message: 'Presentation type ID is required'
            });
        }

        // Prevent 500 crash for invalid ID
        const mongoose = await import('mongoose');
        if (!mongoose.default.isValidObjectId(presentationTypeId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Presentation Type ID format'
            });
        }

        // Get presentation type (Smart Search)
        let presentationType;

        // 1. Try ID
        if (presentationTypeId && presentationTypeId.match(/^[0-9a-fA-F]{24}$/)) {
            try { presentationType = await PresentationType.findById(presentationTypeId); } catch (e) { }
        }

        // 2. Fallback: Search by Name (Feasibility Study) if missing
        if (!presentationType) {
            console.log(`⚠️ [CreateDownload] Presentation Type ID "${presentationTypeId}" not found. Searching by name...`);
            // Check form data for clues
            const formTitle = (formData.subtitle || formData.title || '').toLowerCase();

            if (formTitle.includes('feasibility')) {
                presentationType = await PresentationType.findOne({ name: 'Feasibility Study' });
            } else if (formTitle.includes('credential')) {
                presentationType = await PresentationType.findOne({ name: 'Credential Report' });
            } else {
                // Last ditch: Default to Feasibility Study
                presentationType = await PresentationType.findOne({ name: 'Feasibility Study' });
            }
        }

        if (!presentationType) {
            return res.status(404).json({
                success: false,
                message: 'Presentation type not found'
            });
        }
        console.log(`✅ [CreateDownload] Using Presentation Type: "${presentationType.name}" (ID: ${presentationType._id})`);

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

        // --- NO SECTIONS DEFINED - ERROR ---
        console.error("Presentation type has no sections defined!");
        throw new Error('Presentation type must have sections defined. Please configure sections in the database.');

    } catch (error) {
        console.error('\n[CreateDownload] ERROR:', error.message);
        console.error('Stack:', error.stack);
        next(error);
    }
};
