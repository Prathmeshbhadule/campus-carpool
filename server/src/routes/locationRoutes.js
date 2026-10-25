import express from 'express';
import { getPuneLocalities } from '../controllers/locationController.js';

const router = express.Router();

router.get('/pune', getPuneLocalities);

export default router;
