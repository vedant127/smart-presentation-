import express from 'express';
import { getLibraryStructure, scanLibrary, createFolder } from '../controllers/libraryController.js';

const router = express.Router();

router.get('/structure', getLibraryStructure);
router.post('/scan', scanLibrary);
router.post('/folder', createFolder);

export default router;
