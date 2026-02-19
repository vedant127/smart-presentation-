import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    presentationType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PresentationType',
        required: true
    },
    formData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    plots: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    status: {
        type: String,
        enum: ['draft', 'generated', 'archived'],
        default: 'draft'
    }
}, {
    timestamps: true
});

const Project = mongoose.model('Project', projectSchema);

export default Project;
