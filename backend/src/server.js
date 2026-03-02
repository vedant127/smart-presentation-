import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import connectDatabase from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import apiKeyRoutes from './routes/apiKeyRoutes.js';
import presentationTypeRoutes from './routes/presentationTypeRoutes.js';
import presentationRoutes from './routes/presentationRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import libraryRoutes from './routes/libraryRoutes.js';
import presentationTemplateRoutes from './routes/presentationTemplateRoutes.js';
import templateDataRoutes from './routes/templateDataRoutes.js';

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the project root
const envPath = path.resolve(process.cwd(), '.env');
const envPathAlt = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config({ path: envPathAlt });
}
const config = {
    port: process.env.PORT || 5000,
    corsOrigin: process.env.CORS_ORIGIN || '*'
};

// Initialize Express app
const app = express();

// ─── CORS (MUST be before all routes) ────────────────────────────────────────
// This fixes: "Failed to load response data" + preflight (OPTIONS) failures
const corsOptions = {
    origin: true,                      // reflect requesting origin (allows localhost:5173, etc.)
    credentials: true,                 // allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'], // ← CRITICAL for file downloads
    maxAge: 86400,                     // cache preflight for 24h
};
app.use(cors(corsOptions));

// Handle ALL preflight OPTIONS requests explicitly
app.options('*', cors(corsOptions));

// Request logging (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

app.set('etag', false); // Disable ETags to prevent 304 Not Modified responses
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/presentation-types', presentationTypeRoutes);
app.use('/api/presentations', presentationRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/templates', presentationTemplateRoutes);
// Project Routes
import projectRoutes from './routes/projectRoutes.js';
app.use('/api/projects', projectRoutes);

app.use('/api/data', templateDataRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;

const startServer = async () => {
    try {
        // Validate environment variables
        const { validateEnv } = await import('./config/validateEnv.js');
        if (!validateEnv()) {
            console.error('Server startup aborted due to missing environment variables');
            process.exit(1);
        }

        // Connect to database
        await connectDatabase();

        // Start listening
        // Start listening (0.0.0.0 avoids IPv6 address in use / refused issues)
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 SERVER RUNNING ON PORT ${PORT}`);
            console.log(`📡 CORS ALLOWED FROM: ${config.corsOrigin}`);
            console.log(`Health check: http://localhost:${PORT}/health\n`);
        });

    } catch (error) {
        console.error('failed to start server:', error.message);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Start the server
startServer();

export default app;
