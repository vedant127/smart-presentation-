import mongoose from 'mongoose';

/**
 * API Key Model
 * Manages API keys for external integrations (Gemini, OpenAI, etc.)
 */
const apiKeySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'API key name is required'],
        trim: true
    },
    provider: {
        type: String,
        required: [true, 'Provider is required'],
        enum: ['gemini', 'openai', 'anthropic', 'custom'],
        default: 'gemini'
    },
    key: {
        type: String,
        required: [true, 'API key is required'],
        select: false // Don't return key by default for security
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUsed: {
        type: Date,
        default: null
    },
    usageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for faster queries
apiKeySchema.index({ user: 1, provider: 1 });

// Method to increment usage
apiKeySchema.methods.incrementUsage = async function () {
    this.usageCount += 1;
    this.lastUsed = new Date();
    await this.save();
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

export default ApiKey;
