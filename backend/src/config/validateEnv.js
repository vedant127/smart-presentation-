/**
 * Environment Variable Validation
 * Validates required environment variables on server startup
 */

export const validateEnv = () => {
    const required = [
        'MONGODB_URI',
        'PORT'
    ];

    const optional = [
        'JWT_SECRET',
        'CORS_ORIGIN',
        'NODE_ENV',
        'GEMINI_API_KEY',
        'OPENROUTER_API_KEY'
    ];

    const missing = [];
    const warnings = [];

    // Check required variables
    required.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    });

    // Check optional but recommended variables
    optional.forEach(varName => {
        if (!process.env[varName]) {
            warnings.push(varName);
        }
    });

    // Report results
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        console.error('\n💡 Please check your .env file\n');
        return false;
    }

    if (warnings.length > 0) {
        console.warn('⚠️  Optional environment variables not set:');
        warnings.forEach(v => console.warn(`   - ${v}`));
        console.warn('');
    }

    console.log('✅ Environment variables validated\n');
    return true;
};

/**
 * Get environment configuration
 */
export const getConfig = () => {
    return {
        port: process.env.PORT || 5000,
        mongoUri: process.env.MONGODB_URI,
        jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        corsOrigin: process.env.CORS_ORIGIN || '*',
        nodeEnv: process.env.NODE_ENV || 'development',
        geminiApiKey: process.env.GEMINI_API_KEY,
        openRouterApiKey: process.env.OPENROUTER_API_KEY
    };
};
