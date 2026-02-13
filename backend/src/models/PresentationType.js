import mongoose from 'mongoose';

/**
 * Presentation Type Model
 * Defines different types of presentations (Feasibility Study, Credential Report, etc.)
 */
const presentationTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Presentation type name is required'],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    criteria: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ['single', 'multiple', 'text'],
            default: 'single'
        },
        options: [{
            type: String,
            trim: true
        }],
        required: {
            type: Boolean,
            default: false
        }
    }],
    sections: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        order: {
            type: Number,
            required: true
        },
        isVarying: {
            type: Boolean,
            default: false
        },
        varyingCriteria: [{
            type: String,
            trim: true
        }],
        folderPath: {
            type: String,
            trim: true
        }
    }],
    enablePlots: {
        type: Boolean,
        default: false
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

// Index for faster queries
// Note: 'unique: true' on 'name' already creates an index, so we don't need to define it again manually here to avoid "Duplicate schema index" warning.

const PresentationType = mongoose.model('PresentationType', presentationTypeSchema);

export default PresentationType;
