import express from 'express';
import { getUploadSignature } from '../controllers/uploadcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

// Any authenticated user can request a signature to upload an image.
router.get('/signature', protectRoute, getUploadSignature);

export default router;
