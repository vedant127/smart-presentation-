import fs from 'fs';
import path from 'path';

/**
 * File Browser Controller
 * Manages Library folder browsing and file operations
 */

const LIBRARY_PATH = path.join(process.cwd(), 'Library');

// Ensure Library directory exists
if (!fs.existsSync(LIBRARY_PATH)) {
    fs.mkdirSync(LIBRARY_PATH, { recursive: true });
}

/**
 * @route   GET /api/files/browse
 * @desc    Browse Library folder structure
 * @access  Private
 */
const browse = async (req, res, next) => {
    try {
        const { folderPath = '' } = req.query;

        const targetPath = path.join(LIBRARY_PATH, folderPath);

        // Security check - prevent directory traversal
        if (!targetPath.startsWith(LIBRARY_PATH)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if path exists
        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Check if it's a directory
        const stats = fs.statSync(targetPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({
                success: false,
                message: 'Path is not a directory'
            });
        }

        // Read directory contents
        const items = fs.readdirSync(targetPath);

        const contents = items.map(item => {
            const itemPath = path.join(targetPath, item);
            const itemStats = fs.statSync(itemPath);

            return {
                name: item,
                path: path.relative(LIBRARY_PATH, itemPath).replace(/\\/g, '/'),
                type: itemStats.isDirectory() ? 'folder' : 'file',
                size: itemStats.isFile() ? itemStats.size : null,
                modified: itemStats.mtime,
                extension: itemStats.isFile() ? path.extname(item) : null
            };
        });

        // Sort: folders first, then files
        contents.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'folder' ? -1 : 1;
        });

        res.status(200).json({
            success: true,
            data: {
                currentPath: folderPath,
                contents,
                count: contents.length
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/files/folder
 * @desc    Create a new folder
 * @access  Private (Admin)
 */
const createFolder = async (req, res, next) => {
    try {
        const { folderPath, folderName } = req.body;

        if (!folderName) {
            return res.status(400).json({
                success: false,
                message: 'Folder name is required'
            });
        }

        const targetPath = path.join(LIBRARY_PATH, folderPath || '', folderName);

        // Security check
        if (!targetPath.startsWith(LIBRARY_PATH)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if folder already exists
        if (fs.existsSync(targetPath)) {
            return res.status(409).json({
                success: false,
                message: 'Folder already exists'
            });
        }

        // Create folder
        fs.mkdirSync(targetPath, { recursive: true });

        res.status(201).json({
            success: true,
            message: 'Folder created successfully',
            data: {
                path: path.relative(LIBRARY_PATH, targetPath).replace(/\\/g, '/')
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/files
 * @desc    Delete a file or folder
 * @access  Private (Admin)
 */
const deleteItem = async (req, res, next) => {
    try {
        const { itemPath } = req.body;

        if (!itemPath) {
            return res.status(400).json({
                success: false,
                message: 'Item path is required'
            });
        }

        const targetPath = path.join(LIBRARY_PATH, itemPath);

        // Security check
        if (!targetPath.startsWith(LIBRARY_PATH)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if item exists
        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Delete item
        const stats = fs.statSync(targetPath);
        if (stats.isDirectory()) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(targetPath);
        }

        res.status(200).json({
            success: true,
            message: 'Item deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/files/download
 * @desc    Download a file from Library
 * @access  Private
 */
const downloadFile = async (req, res, next) => {
    try {
        const { filePath } = req.query;

        if (!filePath) {
            return res.status(400).json({
                success: false,
                message: 'File path is required'
            });
        }

        const targetPath = path.join(LIBRARY_PATH, filePath);

        // Security check
        if (!targetPath.startsWith(LIBRARY_PATH)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if file exists
        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check if it's a file
        const stats = fs.statSync(targetPath);
        if (!stats.isFile()) {
            return res.status(400).json({
                success: false,
                message: 'Path is not a file'
            });
        }

        // Send file
        res.download(targetPath, path.basename(targetPath), (err) => {
            if (err) {
                console.error('Download error:', err);
                next(err);
            }
        });

    } catch (error) {
        next(error);
    }
};

export {
    browse,
    createFolder,
    deleteItem,
    downloadFile
};
