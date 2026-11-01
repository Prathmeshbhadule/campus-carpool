import express from 'express';
import { getPuneLocalities, searchRealLocations } from '../controllers/locationController.js';

const router = express.Router();

router.get('/pune', getPuneLocalities);
router.get('/search', searchRealLocations);

export default router;
