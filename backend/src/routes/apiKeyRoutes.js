import express from 'express';
import {
    createApiKey,
    getApiKeys,
    getApiKey,
    updateApiKey,
    deleteApiKey,
    validateApiKey
} from '../controllers/apiKeyController.js';
import { authenticate } from '../middleware/auth.js';
import { validateApiKey as validateApiKeyInput, validateObjectId } from '../middleware/validation.js';

const router = express.Router();

/**
 * API Key Routes
 */

// All routes require authentication
router.use(authenticate);

// @route   POST /api/api-keys
// @desc    Create new API key
// @access  Private
router.post('/', validateApiKeyInput, createApiKey);

// @route   GET /api/api-keys
// @desc    Get all API keys
// @access  Private
router.get('/', getApiKeys);

// @route   GET /api/api-keys/:id
// @desc    Get single API key
// @access  Private
router.get('/:id', validateObjectId, getApiKey);

// @route   PUT /api/api-keys/:id
// @desc    Update API key
// @access  Private
router.put('/:id', validateObjectId, updateApiKey);

// @route   DELETE /api/api-keys/:id
// @desc    Delete API key
// @access  Private
router.delete('/:id', validateObjectId, deleteApiKey);

// @route   POST /api/api-keys/:id/validate
// @desc    Validate API key
// @access  Private
router.post('/:id/validate', validateObjectId, validateApiKey);

export default router;
