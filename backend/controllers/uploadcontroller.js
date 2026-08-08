import { signUpload, signGet, keyFromPublicUrl, uploadsEnabled } from '../lib/objectStorage.js';

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

// Mints a short-lived GET URL for an already-uploaded file, overriding its
// stored Content-Disposition so the SAME object can be opened inline (view,
// for the in-app viewer) or forced to download (download, via an explicit
// button) — no re-upload, no duplicate copies. `url` must be a file we
// actually host (our own R2 public URL), otherwise this would sign a GET for
// an arbitrary key derived from attacker input.
export const getFileAccessUrl = async (req, res) => {
    try {
        if (!uploadsEnabled()) {
            return res.status(503).json({ message: "File access is not configured on the server." });
        }
        const { url, filename, disposition } = req.query;
        const key = keyFromPublicUrl(url);
        if (!key) {
            return res.status(400).json({ message: "url must be a file hosted on this server." });
        }
        const signedUrl = await signGet({
            key,
            filename,
            disposition: disposition === 'download' ? 'download' : 'inline',
        });
        res.status(200).json({ url: signedUrl });
    } catch (error) {
        console.error("Error signing file access url:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
