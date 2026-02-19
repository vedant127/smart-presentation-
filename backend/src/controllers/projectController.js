import Project from '../models/Project.js';
import PresentationType from '../models/PresentationType.js';
import { assemblePresentation } from '../services/presentationServiceNew.js';
import PresentationHistory from '../models/PresentationHistory.js';
import mongoose from 'mongoose';

// @route   POST /api/projects
// @desc    Create a new project (Save data)
// @access  Private
export const createProject = async (req, res, next) => {
    try {
        const { title, presentationTypeId, formData, plots } = req.body;

        // Use guestId if no authentication (for dev)
        const guestId = '000000000000000000000000';
        const userId = req.user ? req.user._id : guestId;

        const project = await Project.create({
            user: userId,
            title: title || formData?.title || 'Untitled Project',
            presentationType: presentationTypeId,
            formData,
            plots,
            status: 'draft'
        });

        res.status(201).json({
            success: true,
            data: { project }
        });
    } catch (error) {
        next(error);
    }
};

// @route   GET /api/projects
// @desc    Get user's projects
// @access  Private
export const getProjects = async (req, res, next) => {
    try {
        const guestId = '000000000000000000000000';
        const userId = req.user ? req.user._id : guestId;

        const projects = await Project.find({ user: userId })
            .populate('presentationType', 'name')
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            data: { projects }
        });
    } catch (error) {
        next(error);
    }
};

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
export const getProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.status(200).json({ success: true, data: { project } });
    } catch (error) {
        next(error);
    }
};

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
export const updateProject = async (req, res, next) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.status(200).json({ success: true, data: { project } });
    } catch (error) {
        next(error);
    }
};

// @route   POST /api/projects/:id/generate
// @desc    Generate presentation from saved project
// @access  Private
export const generateFromProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id).populate('presentationType');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const presentationType = project.presentationType; // Populated
        if (!presentationType) {
            return res.status(404).json({ success: false, message: 'Presentation Type not found for this project' });
        }

        console.log(`\n🏭 GENERATING FROM PROJECT: "${project.title}"`);

        // Prepare data
        let formData = project.formData || {};
        // Normalize
        if (formData.project_name) formData.projectTitle = formData.project_name;
        if (formData.client_name) formData.clientName = formData.client_name;

        // Assembly
        const result = await assemblePresentation({
            presentationType,
            formData,
            plots: project.plots || [],
            userId: project.user
        });

        // Update Project Status
        project.status = 'generated';
        await project.save();

        // Save History
        let fileSize = 0;
        try {
            const fs = await import('fs');
            if (fs.existsSync(result.filePath)) fileSize = fs.statSync(result.filePath).size;
        } catch (e) { }

        const history = await PresentationHistory.create({
            user: project.user,
            presentationType: presentationType._id,
            presentationTypeName: presentationType.name,
            formData: project.formData,
            plots: project.plots,
            generatedFileName: result.fileName,
            filePath: result.filePath,
            fileSize: fileSize,
            status: 'completed'
        });

        res.status(200).json({
            success: true,
            data: {
                presentation: {
                    id: history._id,
                    fileName: result.fileName,
                    downloadUrl: `/api/presentations/download/${history._id}`
                }
            }
        });

    } catch (error) {
        next(error);
    }
};
