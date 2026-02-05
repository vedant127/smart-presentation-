import mongoose from 'mongoose';

/**
 * Presentation History Model
 * Tracks all generated presentations for users
 */
const presentationHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    presentationType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PresentationType',
        required: true
    },
    presentationTypeName: {
        type: String,
        required: true
    },
    formData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    plots: [{
        plotNumber: Number,
        criteria: mongoose.Schema.Types.Mixed
    }],
    generatedFileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'completed'
    },
    error: {
        type: String
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    lastDownloaded: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for faster queries
presentationHistorySchema.index({ user: 1, createdAt: -1 });
presentationHistorySchema.index({ status: 1 });

// Method to increment download count
presentationHistorySchema.methods.incrementDownload = async function () {
    this.downloadCount += 1;
    this.lastDownloaded = new Date();
    await this.save();
};

const PresentationHistory = mongoose.model('PresentationHistory', presentationHistorySchema);

export default PresentationHistory;
