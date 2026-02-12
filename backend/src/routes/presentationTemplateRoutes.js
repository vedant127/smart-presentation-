import express from 'express';
import {
    getTemplates,
    createTemplate,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    matchTemplate
} from '../controllers/presentationTemplateController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware if needed
// router.use(authenticate);

router.route('/')
    .get(getTemplates)
    .post(createTemplate);

router.post('/match', matchTemplate);

router.route('/:id')
    .get(getTemplate)
    .put(updateTemplate)
    .delete(deleteTemplate);

export default router;
