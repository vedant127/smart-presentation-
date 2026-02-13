import TemplateData from '../models/TemplateData.js';
import PresentationType from '../models/PresentationType.js';

// @desc    Get ALL template data
// @route   GET /api/data
// @access  Public (or Protected)
const getAllData = async (req, res) => {
    try {
        const data = await TemplateData.find({});
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all template data for a presentation type
// @route   GET /api/data/:typeId
// @access  Public (or Protected)
const getTemplateData = async (req, res) => {
    try {
        const { typeId } = req.params;
        const data = await TemplateData.find({ presentationType: typeId });
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create template data
// @route   POST /api/data
// @access  Public (or Protected)
const createTemplateData = async (req, res) => {
    try {
        const { typeId, sectionName, criteriaKey, data } = req.body;

        // Ensure type exists
        const type = await PresentationType.findById(typeId);
        if (!type) {
            return res.status(404).json({ success: false, message: 'Presentation Type not found' });
        }

        // Check if data already exists for this combination
        // But what if we just update it? Or return error?
        // Let's upsert for user convenience or throw error if user wants explicit create.
        // For simplicity, let's create or fail if unique constraint violated (handled by model).

        const newData = await TemplateData.create({
            presentationType: typeId,
            sectionName,
            criteriaKey: criteriaKey.toLowerCase(),
            data
        });

        res.status(201).json({ success: true, data: newData });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Data already exists for this section and criteria combination' });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update template data
// @route   PUT /api/data/:id
// @access  Public (or Protected)
const updateTemplateData = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = await TemplateData.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedData) {
            return res.status(404).json({ success: false, message: 'Data not found' });
        }
        res.status(200).json({ success: true, data: updatedData });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete template data
// @route   DELETE /api/data/:id
// @access  Public (or Protected)
const deleteTemplateData = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedData = await TemplateData.findByIdAndDelete(id);
        if (!deletedData) {
            return res.status(404).json({ success: false, message: 'Data not found' });
        }
        res.status(200).json({ success: true, message: 'Data deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get specific data by query (for preview or generation)
// @route   GET /api/data/query
// @access  Public
const queryTemplateData = async (req, res) => {
    try {
        const { typeId, sectionName, criteriaKey } = req.query;
        // Find exact match or partial/fallback?
        // Current requirement: exact criteria key match
        const data = await TemplateData.findOne({
            presentationType: typeId,
            sectionName,
            criteriaKey: criteriaKey.toLowerCase()
        });

        if (!data) {
            return res.status(404).json({ success: false, message: 'No data found for these criteria' });
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export {
    getAllData,
    getTemplateData,
    createTemplateData,
    updateTemplateData,
    deleteTemplateData,
    queryTemplateData
};
