import { body, param, validationResult } from 'express-validator';

/**
 * Validation Middleware
 * Validates request data before processing
 */

// Check validation results
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

// User registration validation
const validateRegistration = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    validate
];

// User login validation
const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),

    validate
];

// API Key validation
const validateApiKey = [
    body('name')
        .trim()
        .notEmpty().withMessage('API key name is required'),

    body('provider')
        .trim()
        .notEmpty().withMessage('Provider is required')
        .isIn(['gemini', 'openai', 'anthropic', 'custom']).withMessage('Invalid provider'),

    body('key')
        .trim()
        .notEmpty().withMessage('API key is required'),

    validate
];

// Presentation Type validation
const validatePresentationType = [
    body('name')
        .trim()
        .notEmpty().withMessage('Presentation type name is required'),

    body('criteria')
        .optional()
        .isArray().withMessage('Criteria must be an array'),

    body('sections')
        .optional()
        .isArray().withMessage('Sections must be an array'),

    validate
];

// MongoDB ObjectId validation
const validateObjectId = [
    param('id')
        .isMongoId().withMessage('Invalid ID format'),

    validate
];

export {
    validate,
    validateRegistration,
    validateLogin,
    validateApiKey,
    validatePresentationType,
    validateObjectId
};
