import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Multer Configuration for File Uploads
 * Handles PPTX file uploads with validation
 */

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// File filter - only accept PPTX files
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint'
    ];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || ext === '.pptx' || ext === '.ppt') {
        cb(null, true);
    } else {
        cb(new Error('Only PowerPoint files (.pptx, .ppt) are allowed'), false);
    }
};

// Multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    }
});

export default upload;
