import express from 'express';
import { getUploadSignature, getFileAccessUrl } from '../controllers/uploadcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

// Any authenticated user can request a signature to upload an image.
router.get('/signature', protectRoute, getUploadSignature);

// Mint a signed view/download URL for an already-uploaded file.
router.get('/access', protectRoute, getFileAccessUrl);

export default router;
