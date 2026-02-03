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
            enum: ['single', 'multiple'],
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
presentationTypeSchema.index({ name: 1 });

const PresentationType = mongoose.model('PresentationType', presentationTypeSchema);

export default PresentationType;
