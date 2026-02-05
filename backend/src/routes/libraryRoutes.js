import express from 'express';
import { getLibraryStructure } from '../controllers/libraryController.js';

const router = express.Router();

// @route   GET /api/library
// @desc    Get full library folder structure
// @access  Public (for now)
router.get('/', getLibraryStructure);

export default router;
