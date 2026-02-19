
import express from 'express';
import {
    createProject,
    getProjects,
    getProject,
    updateProject,
    generateFromProject
} from '../controllers/projectController.js';

const router = express.Router();

router.route('/')
    .post(createProject)
    .get(getProjects);

router.route('/:id')
    .get(getProject)
    .put(updateProject);

router.post('/:id/generate', generateFromProject);

export default router;
