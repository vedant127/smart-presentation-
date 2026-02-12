import express from 'express';
import {
    generate,
    getHistory,
    getHistoryItem,
    download,
    deleteHistory,
    createAndDownload,
    generateSelection,

} from '../controllers/presentationController.js';
import { authenticate } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';

const router = express.Router();

/**
 * Presentation Generation Routes
 */

// @route   POST /api/presentations/create-download
// @desc    Generate and immediately download presentation
// @access  Public
router.post('/create-download', createAndDownload);

// @route   POST /api/presentations/generate-presentation
// @desc    Select appropriate slides based on user input
// @access  Public
router.post('/generate-presentation', generateSelection);

// @route   POST /api/presentations/generate
// @desc    Generate presentation (legacy/history based)
// @access  Public (temporarily or Private depending on Auth)
router.post('/generate', generate);

// All routes require authentication
router.use(authenticate);

// @route   POST /api/presentations/create-pro
// @desc    Generate a Professional AI-Designed PPTX (Gamma.ai style)
// @access  Private
// createPro route removed

// @route   GET /api/presentations/history
// @desc    Get presentation history
// @access  Private
router.get('/history', getHistory);

// @route   GET /api/presentations/history/:id
// @desc    Get single presentation from history
// @access  Private
router.get('/history/:id', validateObjectId, getHistoryItem);

// @route   GET /api/presentations/download/:id
// @desc    Download presentation
// @access  Private
router.get('/download/:id', validateObjectId, download);

// @route   DELETE /api/presentations/history/:id
// @desc    Delete presentation from history
// @access  Private
router.delete('/history/:id', validateObjectId, deleteHistory);

export default router;
