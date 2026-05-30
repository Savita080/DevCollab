import { signUpload, uploadsEnabled } from '../lib/storage.js';

// Returns the params a logged-in client needs to upload one image directly to
// Cloudinary. Auth is enforced by protectRoute on the route.
export const getUploadSignature = async (req, res) => {
    try {
        if (!uploadsEnabled()) {
            return res.status(503).json({ message: "Image uploads are not configured on the server." });
        }
        const sig = signUpload({ folder: 'realcollab' });
        res.status(200).json(sig);
    } catch (error) {
        console.error("Error signing upload:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
