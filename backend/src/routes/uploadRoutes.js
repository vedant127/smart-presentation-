import express from 'express';
import {
    uploadFile,
    uploadMultipleFiles
} from '../controllers/uploadController.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import upload from '../config/multer.js';

const router = express.Router();

/**
 * Upload Routes
 */

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorizeAdmin);

// @route   POST /api/upload
// @desc    Upload single PPTX file
// @access  Private (Admin)
router.post('/', upload.single('file'), uploadFile);

// @route   POST /api/upload/multiple
// @desc    Upload multiple PPTX files
// @access  Private (Admin)
router.post('/multiple', upload.array('files', 10), uploadMultipleFiles);

export default router;
