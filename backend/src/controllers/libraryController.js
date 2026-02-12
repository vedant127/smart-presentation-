import LibraryItem from '../models/LibraryItem.js';
import fs from 'fs';
import path from 'path';

/**
 * Get the full library tree structure
 */
export const getLibraryStructure = async (req, res, next) => {
    try {
        const items = await LibraryItem.find({}).sort({ type: -1, name: 1 }); // Folders first

        // Transform flat list to tree
        const buildTree = (parentId = null) => {
            return items
                .filter(item => String(item.parentId) === String(parentId))
                .map(item => ({
                    _id: item._id,
                    name: item.name,
                    path: item.path,
                    type: item.type,
                    size: item.size,
                    children: item.type === 'folder' ? buildTree(item._id) : undefined
                }));
        };

        // Root items have parentId: null. 
        const rootItems = items.filter(item => !item.parentId);
        const tree = rootItems.map(item => ({
            _id: item._id,
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            children: item.type === 'folder' ? buildTree(item._id) : undefined
        }));

        res.status(200).json({
            success: true,
            data: tree
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Recursively scan the Library folder and update the database
 */
export const scanLibrary = async (req, res, next) => {
    try {
        // 1. Locate Library Folder
        let libraryRoot = path.join(process.cwd(), 'Library');
        if (!fs.existsSync(libraryRoot)) {
            libraryRoot = path.join(process.cwd(), '..', 'Library');
        }

        if (!fs.existsSync(libraryRoot)) {
            // Auto-create if missing (e.g. for first run)
            fs.mkdirSync(libraryRoot, { recursive: true });
        }

        const stats = { added: 0, updated: 0, removed: 0 };

        // 2. Clear existing entries (Simple sync strategy: Wipe and Rebuild, or Upsert?)
        // For distinct IDs, Upsert is better, but Wipe is cleaner for structure changes.
        // Let's go with Wipe for now to ensure consistency with filesystem.
        // in production: better to sync smarter to preserve references.
        // compromise: we will wipe and rebuild. IDs will change.
        // WARNING: This breaks 'PresentationTemplate' references if references are by ObjectId.
        // FIX: 'PresentationTemplate' links by ObjectId. We CANNOT wipe blindly.
        // We must sync: Match by PATH.

        console.log(`Starting scan of: ${libraryRoot}`);

        const existingItems = await LibraryItem.find({});
        const existingMap = new Map(); // path -> item
        existingItems.forEach(i => existingMap.set(i.path, i));

        const activeIds = new Set();

        const processDir = async (dirPath, parentId = null, relativePathPrefix = '') => {
            const list = fs.readdirSync(dirPath);

            for (const name of list) {
                // Ignore hidden files
                if (name.startsWith('.')) continue;

                const fullPath = path.join(dirPath, name);
                const stat = fs.statSync(fullPath);
                const isDir = stat.isDirectory();

                // Construct relative path (for uniqueness)
                const relativePath = relativePathPrefix ? `${relativePathPrefix}/${name}` : name;

                // Find or Create
                let item = existingMap.get(relativePath);

                if (item) {
                    // Update if needed
                    if (item.type !== (isDir ? 'folder' : 'file') || String(item.parentId) !== String(parentId)) {
                        item.type = isDir ? 'folder' : 'file';
                        item.parentId = parentId;
                        await item.save();
                        stats.updated++;
                    }
                } else {
                    // Create
                    item = await LibraryItem.create({
                        name,
                        type: isDir ? 'folder' : 'file',
                        path: relativePath,
                        parentId,
                        size: isDir ? '' : `${(stat.size / 1024).toFixed(1)} KB`
                    });
                    stats.added++;
                }

                activeIds.add(String(item._id));

                // Recurse
                if (isDir) {
                    await processDir(fullPath, item._id, relativePath);
                }
            }
        };

        await processDir(libraryRoot, null, '');

        // 3. Remove orphaned items (in DB but not in FS)
        // Need to be careful about deleting items that templates might reference.
        // But if the file is gone, the reference is broken anyway.

        const itemsToDelete = existingItems.filter(i => !activeIds.has(String(i._id)));
        if (itemsToDelete.length > 0) {
            await LibraryItem.deleteMany({ _id: { $in: itemsToDelete.map(i => i._id) } });
            stats.removed = itemsToDelete.length;
        }

        res.status(200).json({
            success: true,
            message: 'Library scan complete',
            stats
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Create a new folder (Mock/MVP)
 */
export const createFolder = async (req, res, next) => {
    try {
        // Assume req.body contains name, parentId (optional)
        // This is just a placeholder for full file management logic
        res.status(201).json({ message: "Folder creation logic goes here" });
    } catch (e) { next(e); }
};
