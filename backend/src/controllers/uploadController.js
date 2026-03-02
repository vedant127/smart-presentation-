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

        // Copy then delete (avoids EPERM on Windows/OneDrive when rename fails)
        fs.copyFileSync(req.file.path, targetPath);
        try { fs.unlinkSync(req.file.path); } catch (_) {}

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

// Map form field names → Library subfolder (relative to Library/)
const FIELD_TO_FOLDER = {
    cover: 'Feasibility Study/01_Cover Page',
    toc: 'Feasibility Study/02_Table of Contents',
    project_background: 'Feasibility Study/03_Project Background',
    executive_summary: 'Feasibility Study/04_Executive Summary',
    site_assessment: 'Feasibility Study/05_Site Assessment',
    'Market overview': 'Feasibility Study/06_Market Overview',
    market_overview: 'Feasibility Study/06_Market Overview',
    devrec_part1: 'Feasibility Study/07_Development Recommendations Part 1',
    devrec_part2: 'Feasibility Study/08_Development Recommendations Part 2',
    devrec_part3: 'Feasibility Study/09_Development Recommendations Part 3',
    financial: 'Feasibility Study/10_Financial & Investment Analysis',
    financial_investment_analysis: 'Feasibility Study/10_Financial & Investment Analysis',
    disclaimer: 'Feasibility Study/11_Disclaimer',
};

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple PPTX files (section-specific fields: cover, toc, Market overview, etc.)
 * @access  Private (Admin)
 */
const uploadMultipleFiles = async (req, res, next) => {
    try {
        // req.files is array when using upload.any(): [{ fieldname, originalname, path }, ...]
        const fileList = Array.isArray(req.files) ? req.files : [];
        if (fileList.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const uploadedFiles = [];

        for (const file of fileList) {
            const fieldName = file.fieldname || '';
            const destFolder = FIELD_TO_FOLDER[fieldName];
            if (!destFolder) {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                continue;
            }

            const targetDir = path.join(LIBRARY_PATH, destFolder);
            if (!targetDir.startsWith(LIBRARY_PATH)) {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const targetPath = path.join(targetDir, file.originalname);
            // Copy then delete (avoids EPERM on Windows/OneDrive when rename fails)
            fs.copyFileSync(file.path, targetPath);
            try { fs.unlinkSync(file.path); } catch (_) {}
            const stats = fs.statSync(targetPath);

            uploadedFiles.push({
                name: file.originalname,
                path: path.relative(LIBRARY_PATH, targetPath).replace(/\\/g, '/'),
                size: stats.size,
                section: fieldName,
                extension: path.extname(file.originalname)
            });
        }

        if (uploadedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid files uploaded (check field names match expected sections)'
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
        if (Array.isArray(req.files)) {
            req.files.forEach(f => {
                if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
        }
        next(error);
    }
};

export {
    uploadFile,
    uploadMultipleFiles
};
