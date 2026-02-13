import express from 'express';
import { getAllData, getTemplateData, createTemplateData, updateTemplateData, deleteTemplateData, queryTemplateData } from '../controllers/templateDataController.js';

const router = express.Router();

router.get('/', getAllData);
router.get('/query', queryTemplateData); // Specific routes first
router.get('/:typeId', getTemplateData);
router.post('/', createTemplateData);
router.put('/:id', updateTemplateData);
router.delete('/:id', deleteTemplateData);

export default router;
