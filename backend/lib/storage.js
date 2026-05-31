// lib/storage.js — Cloudinary image storage.
//
// We use SIGNED direct uploads: the backend signs a set of upload params with
// the API secret, the browser uploads the file straight to Cloudinary using
// that signature (the file never touches our server), and Cloudinary returns a
// hosted URL we then store on the message/task.
//
// Env-guarded like redis/webpush — if keys are missing, uploads are disabled
// and the rest of the app keeps working.
import { v2 as cloudinary } from 'cloudinary';

const enabled = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (enabled) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
} else {
    console.warn("WARNING: CLOUDINARY_* env vars missing. Image uploads are disabled.");
}

export const uploadsEnabled = () => enabled;

// Build a signature the browser needs to perform a direct upload. We pin the
// folder server-side so clients can't upload outside our namespace, and a
// timestamp so signatures expire.
export function signUpload({ folder = 'realcollab' } = {}) {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { timestamp, folder };
    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET
    );
    return {
        signature,
        timestamp,
        folder,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    };
}

export default cloudinary;
