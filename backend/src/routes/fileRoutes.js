import express from 'express';
import {
    browse,
    createFolder,
    deleteItem,
    downloadFile
} from '../controllers/fileController.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * File Browser Routes
 */

// All routes require authentication
router.use(authenticate);

// @route   GET /api/files/browse
// @desc    Browse Library folder
// @access  Private
router.get('/browse', browse);

// @route   GET /api/files/download
// @desc    Download file from Library
// @access  Private
router.get('/download', downloadFile);

// Admin-only routes
router.use(authorizeAdmin);

// @route   POST /api/files/folder
// @desc    Create new folder
// @access  Private (Admin)
router.post('/folder', createFolder);

// @route   DELETE /api/files
// @desc    Delete file or folder
// @access  Private (Admin)
router.delete('/', deleteItem);

export default router;
