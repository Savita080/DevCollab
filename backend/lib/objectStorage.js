// lib/objectStorage.js — Cloudflare R2 file storage (S3-compatible).
//
// Signed direct uploads, same shape as the old Cloudinary flow: the backend
// signs a presigned PUT URL, the browser uploads the file straight to R2 (the
// file never touches our server), and we hand back a public URL to store on
// the message/task.
//
// Env-guarded like redis/webpush — if keys are missing, uploads are disabled
// and the rest of the app keeps working.
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const enabled = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
);

let s3 = null;

if (enabled) {
    s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });
} else {
    console.warn("WARNING: R2_* env vars missing. File uploads are disabled.");
}

export const uploadsEnabled = () => enabled;

// One-time upload URL, valid for 5 minutes. Client PUTs the raw file body to
// this URL with the same Content-Type + Content-Disposition it was signed
// with. Images are stored `inline` (so chat/task previews render them
// directly); everything else is stored `attachment` so opening the public
// URL downloads the file with its original name instead of rendering inline.
export async function signUpload({ filename = 'file', contentType = 'application/octet-stream' } = {}) {
    const ext = (filename.split('.').pop() || '').slice(0, 10);
    const key = `realcollab/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;

    // Strip characters that would break the header value; keep it ASCII-safe.
    const safeName = (filename || 'file').replace(/["\r\n]/g, '').slice(0, 200);
    const disposition = contentType.startsWith('image/')
        ? 'inline'
        : `attachment; filename="${safeName}"`;

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        ContentDisposition: disposition,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
        uploadUrl,
        key,
        contentDisposition: disposition,
        publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
    };
}

export default s3;
