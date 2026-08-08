// lib/upload.js — client-side upload to Cloudflare R2 via a backend-signed
// direct upload. Flow:
//   1. (images only) resize/compress in the browser — cheaper + faster than
//      uploading multi-MB originals
//   2. ask our backend for a one-time presigned PUT URL
//   3. PUT the file straight to R2 (the file never touches our server)
//   4. return { url, ... }
import { uploads as uploadsApi } from './api';

const MAX_DIM = 1600;       // longest edge, px — plenty for chat/task images
const JPEG_QUALITY = 0.82;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;       // reject images > 10MB
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024; // reject other files > 50MB
export const isImage = (file) => file && file.type.startsWith('image/');

// Downscale + re-encode to a JPEG blob. GIFs are passed through untouched so
// animation survives.
async function resizeImage(file) {
  if (file.type === 'image/gif') return file;

  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = MAX_DIM / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  return { blob: blob || file, width, height };
}

// PUT `blob` to a presigned R2 URL, reporting progress via onProgress(0-100).
// `contentDisposition` must match what the backend signed the URL with.
function putToR2(uploadUrl, blob, contentType, contentDisposition, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    if (contentDisposition) xhr.setRequestHeader('Content-Disposition', contentDisposition);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(blob);
  });
}

// Upload one image file. Returns { url, width, height }. Throws on failure.
export async function uploadImage(file, { onProgress } = {}) {
  if (!isImage(file)) throw new Error('Only image files are allowed');
  if (file.size > MAX_FILE_BYTES) throw new Error('Image is too large (max 10MB)');

  const resized = await resizeImage(file);
  const blob = resized.blob || resized;          // gif path returns the raw file
  const dims = resized.width ? { width: resized.width, height: resized.height } : {};
  const contentType = blob.type || file.type;

  const { data: sig } = await uploadsApi.signature(file.name, contentType);
  await putToR2(sig.uploadUrl, blob, contentType, sig.contentDisposition, onProgress);

  return { url: sig.publicUrl, width: dims.width, height: dims.height };
}

// Upload one non-image file, no resize. Returns { url, name, size, mimeType }.
export async function uploadFile(file, { onProgress } = {}) {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('File is too large (max 50MB)');

  const contentType = file.type || 'application/octet-stream';
  const { data: sig } = await uploadsApi.signature(file.name, contentType);
  await putToR2(sig.uploadUrl, file, contentType, sig.contentDisposition, onProgress);

  return { url: sig.publicUrl, name: file.name, size: file.size, mimeType: contentType };
}
