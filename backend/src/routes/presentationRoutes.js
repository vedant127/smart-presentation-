import express from 'express';
import {
    generate,
    getHistory,
    getHistoryItem,
    download,
    deleteHistory
} from '../controllers/presentationController.js';
import { authenticate } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';

const router = express.Router();

/**
 * Presentation Generation Routes
 */

// All routes require authentication
router.use(authenticate);

// @route   POST /api/presentations/generate
// @desc    Generate presentation
// @access  Private
router.post('/generate', generate);

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
