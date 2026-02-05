import LibraryItem from '../models/LibraryItem.js';

/**
 * Get the full library tree structure
 */
export const getLibraryStructure = async (req, res, next) => {
    try {
        const items = await LibraryItem.find({}).sort({ type: -1, name: 1 }); // Folders first

        // Transform flat list to tree
        const buildTree = (parentId = null) => {
            return items
                .filter(item => String(item.parentId) === String(parentId)) // Careful with null/ObjectId check
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
        // Note: String(null) is "null". String(undefined) is "undefined". 
        // We filter where item.parentId is strictly null or its string representation matches.

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
 * Create a new folder (Mock/MVP)
 */
export const createFolder = async (req, res, next) => {
    try {
        // Assume req.body contains name, parentId (optional)
        // This is just a placeholder for full file management logic
        res.status(201).json({ message: "Folder creation logic goes here" });
    } catch (e) { next(e); }
};
