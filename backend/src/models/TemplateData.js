import mongoose from 'mongoose';

const templateDataSchema = new mongoose.Schema({
    presentationType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PresentationType',
        required: true
    },
    sectionName: {
        type: String,
        required: true,
        trim: true
    },
    // The combination of criteria values that this data applies to
    // e.g., ["Bangalore", "Commercial"] or just a string key "bangalore_commercial"
    // Let's use an array of tags/keywords for flexibility, or a structured object.
    // The user example: "criteria_key": "bangalore + commercial"
    criteriaKey: {
        type: String,
        required: true,
        index: true,
        trim: true
        // format: "val1 + val2" (lowercase, sorted?)
    },
    // The actual content to inject
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index to ensure unique data for a specific section + criteria combination
templateDataSchema.index({ presentationType: 1, sectionName: 1, criteriaKey: 1 }, { unique: true });

const TemplateData = mongoose.model('TemplateData', templateDataSchema);

export default TemplateData;
