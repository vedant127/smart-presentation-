import mongoose from 'mongoose';

const libraryItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['folder', 'file'],
        required: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LibraryItem',
        default: null
    },
    path: { // Full path for easy lookup (e.g., "Feasibility Study/01_Cover")
        type: String,
        required: true
    },
    size: {
        type: String, // e.g. "2.5MB"
        default: ''
    }
}, { timestamps: true });

// Check if model exists before compiling to avoid "OverwriteModelError"
const LibraryItem = mongoose.models.LibraryItem || mongoose.model('LibraryItem', libraryItemSchema);

export default LibraryItem;
