/**
 * Response Utility
 * Standardized API response helpers
 */

/**
 * Success response
 */
const successResponse = (res, statusCode, message, data = null) => {
    const response = {
        success: true,
        message
    };

    if (data) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

/**
 * Error response
 */
const errorResponse = (res, statusCode, message, errors = null) => {
    const response = {
        success: false,
        message
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

/**
 * Pagination helper
 */
const getPaginationData = (page, limit, total) => {
    return {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
    };
};

export {
    successResponse,
    errorResponse,
    getPaginationData
};
