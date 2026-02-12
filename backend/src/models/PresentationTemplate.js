import mongoose from 'mongoose';

const slideSlotSchema = new mongoose.Schema({
    sectionName: {
        type: String, // e.g., "Market Analysis"
        required: true
    },
    libraryItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LibraryItem',
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    isOptional: {
        type: Boolean,
        default: false
    }
});

const presentationTemplateSchema = new mongoose.Schema({
    city: {
        type: String,
        required: true,
        trim: true
    },
    assetType: {
        type: String,  // e.g. "Residential", "Commercial"
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    slides: [slideSlotSchema],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    indexes: [
        { city: 1, assetType: 1, unique: true } // Ensure unique combination
    ]
});

const PresentationTemplate = mongoose.models.PresentationTemplate || mongoose.model('PresentationTemplate', presentationTemplateSchema);

export default PresentationTemplate;
