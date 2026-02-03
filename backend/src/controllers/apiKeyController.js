import ApiKey from '../models/ApiKey.js';

/**
 * API Key Controller
 * Manages API keys for external services
 */

/**
 * @route   POST /api/api-keys
 * @desc    Create a new API key
 * @access  Private
 */
const createApiKey = async (req, res, next) => {
    try {
        const { name, provider, key } = req.body;

        const apiKey = await ApiKey.create({
            user: req.user._id,
            name,
            provider,
            key
        });

        // Return without the actual key for security
        const response = apiKey.toObject();
        delete response.key;

        res.status(201).json({
            success: true,
            message: 'API key created successfully',
            data: { apiKey: response }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/api-keys
 * @desc    Get all API keys for current user
 * @access  Private
 */
const getApiKeys = async (req, res, next) => {
    try {
        const apiKeys = await ApiKey.find({ user: req.user._id });

        res.status(200).json({
            success: true,
            data: {
                apiKeys,
                count: apiKeys.length
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/api-keys/:id
 * @desc    Get single API key
 * @access  Private
 */
const getApiKey = async (req, res, next) => {
    try {
        const apiKey = await ApiKey.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!apiKey) {
            return res.status(404).json({
                success: false,
                message: 'API key not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { apiKey }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/api-keys/:id
 * @desc    Update API key
 * @access  Private
 */
const updateApiKey = async (req, res, next) => {
    try {
        const { name, key, isActive } = req.body;

        const apiKey = await ApiKey.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!apiKey) {
            return res.status(404).json({
                success: false,
                message: 'API key not found'
            });
        }

        if (name) apiKey.name = name;
        if (key) apiKey.key = key;
        if (typeof isActive !== 'undefined') apiKey.isActive = isActive;

        await apiKey.save();

        const response = apiKey.toObject();
        delete response.key;

        res.status(200).json({
            success: true,
            message: 'API key updated successfully',
            data: { apiKey: response }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/api-keys/:id
 * @desc    Delete API key
 * @access  Private
 */
const deleteApiKey = async (req, res, next) => {
    try {
        const apiKey = await ApiKey.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!apiKey) {
            return res.status(404).json({
                success: false,
                message: 'API key not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'API key deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/api-keys/:id/validate
 * @desc    Validate API key
 * @access  Private
 */
const validateApiKey = async (req, res, next) => {
    try {
        const apiKey = await ApiKey.findOne({
            _id: req.params.id,
            user: req.user._id
        }).select('+key');

        if (!apiKey) {
            return res.status(404).json({
                success: false,
                message: 'API key not found'
            });
        }

        if (!apiKey.isActive) {
            return res.status(400).json({
                success: false,
                message: 'API key is inactive'
            });
        }

        // Here you would implement actual validation logic based on provider
        // For now, we'll just check if key exists
        const isValid = apiKey.key && apiKey.key.length > 0;

        res.status(200).json({
            success: true,
            data: {
                isValid,
                provider: apiKey.provider,
                lastUsed: apiKey.lastUsed
            }
        });

    } catch (error) {
        next(error);
    }
};

export {
    createApiKey,
    getApiKeys,
    getApiKey,
    updateApiKey,
    deleteApiKey,
    validateApiKey
};
