import express from 'express';
import {
    createPresentationType,
    getPresentationTypes,
    getPresentationType,
    updatePresentationType,
    deletePresentationType,
    getFormSchema
} from '../controllers/presentationTypeController.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { validatePresentationType, validateObjectId } from '../middleware/validation.js';

const router = express.Router();

/**
 * Presentation Type Routes
 */

// @route   GET /api/presentation-types
// @desc    Get all presentation types
// @access  Public
router.get('/', getPresentationTypes);

// @route   GET /api/presentation-types/:id
// @desc    Get single presentation type
// @access  Public
router.get('/:id', validateObjectId, getPresentationType);

// @route   GET /api/presentation-types/:id/form-schema
// @desc    Get form schema for presentation type
// @access  Public
router.get('/:id/form-schema', validateObjectId, getFormSchema);

// Protected routes (require authentication and admin role)
router.use(authenticate);
router.use(authorizeAdmin);

// @route   POST /api/presentation-types
// @desc    Create new presentation type
// @access  Private (Admin)
router.post('/', validatePresentationType, createPresentationType);

// @route   PUT /api/presentation-types/:id
// @desc    Update presentation type
// @access  Private (Admin)
router.put('/:id', validateObjectId, updatePresentationType);

// @route   DELETE /api/presentation-types/:id
// @desc    Delete presentation type
// @access  Private (Admin)
router.delete('/:id', validateObjectId, deletePresentationType);

export default router;
