import { signUpload, uploadsEnabled } from '../lib/objectStorage.js';

// Returns a presigned R2 PUT URL + the public URL the client should store
// once the upload completes. Auth is enforced by protectRoute on the route.
export const getUploadSignature = async (req, res) => {
    try {
        if (!uploadsEnabled()) {
            return res.status(503).json({ message: "File uploads are not configured on the server." });
        }
        const { filename, contentType } = req.query;
        const sig = await signUpload({ filename, contentType });
        res.status(200).json(sig);
    } catch (error) {
        console.error("Error signing upload:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
