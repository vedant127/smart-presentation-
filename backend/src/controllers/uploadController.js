import fs from 'fs';
import path from 'path';

/**
 * Upload Controller
 * Handles PPTX file uploads to Library folder
 */

const LIBRARY_PATH = path.join(process.cwd(), 'Library');

/**
 * @route   POST /api/upload
 * @desc    Upload PPTX file to Library folder
 * @access  Private (Admin)
 */
const uploadFile = async (req, res, next) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { destinationPath } = req.body;

        if (destinationPath === undefined || destinationPath === null) {
            // Delete uploaded file
            if (req.file) fs.unlinkSync(req.file.path);

            return res.status(400).json({
                success: false,
                message: 'Destination path is required'
            });
        }

        // Build target path
        const targetDir = path.join(LIBRARY_PATH, destinationPath);
        const targetPath = path.join(targetDir, req.file.originalname);

        // Security check
        if (!targetPath.startsWith(LIBRARY_PATH)) {
            fs.unlinkSync(req.file.path);

            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Create directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Move file from uploads to Library
        fs.renameSync(req.file.path, targetPath);

        const stats = fs.statSync(targetPath);

        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                file: {
                    name: req.file.originalname,
                    path: path.relative(LIBRARY_PATH, targetPath).replace(/\\/g, '/'),
                    size: stats.size,
                    type: 'file',
                    extension: path.extname(req.file.originalname)
                }
            }
        });

    } catch (error) {
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
};

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple PPTX files
 * @access  Private (Admin)
 */
const uploadMultipleFiles = async (req, res, next) => {
    try {
        // Check if files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const { destinationPath } = req.body;

        if (!destinationPath) {
            // Delete uploaded files
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });

            return res.status(400).json({
                success: false,
                message: 'Destination path is required'
            });
        }

        const targetDir = path.join(LIBRARY_PATH, destinationPath);

        // Security check
        if (!targetDir.startsWith(LIBRARY_PATH)) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });

            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Create directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const uploadedFiles = [];

        // Move each file
        for (const file of req.files) {
            const targetPath = path.join(targetDir, file.originalname);
            fs.renameSync(file.path, targetPath);

            const stats = fs.statSync(targetPath);

            uploadedFiles.push({
                name: file.originalname,
                path: path.relative(LIBRARY_PATH, targetPath).replace(/\\/g, '/'),
                size: stats.size,
                type: 'file',
                extension: path.extname(file.originalname)
            });
        }

        res.status(201).json({
            success: true,
            message: `${uploadedFiles.length} files uploaded successfully`,
            data: {
                files: uploadedFiles,
                count: uploadedFiles.length
            }
        });

    } catch (error) {
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        next(error);
    }
};

export {
    uploadFile,
    uploadMultipleFiles
};
