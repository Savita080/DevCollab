// lib/upload.js — client-side image upload to Cloudinary via a backend-signed
// direct upload. Flow:
//   1. resize/compress the image in the browser (cheaper + faster than uploading
//      multi-MB originals; Cloudinary free tier doesn't auto-transform on upload)
//   2. ask our backend for a one-time signature
//   3. POST the file straight to Cloudinary (the file never touches our server)
//   4. return { url, width, height }
import { uploads as uploadsApi } from './api';

const MAX_DIM = 1600;       // longest edge, px — plenty for chat/task images
const JPEG_QUALITY = 0.82;

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // reject originals > 10MB
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

// Upload one image file. Returns { url, width, height }. Throws on failure.
export async function uploadImage(file) {
  if (!isImage(file)) throw new Error('Only image files are allowed');
  if (file.size > MAX_FILE_BYTES) throw new Error('Image is too large (max 10MB)');

  const resized = await resizeImage(file);
  const blob = resized.blob || resized;          // gif path returns the raw file
  const dims = resized.width ? { width: resized.width, height: resized.height } : {};

  // 1. signature from our backend
  const { data: sig } = await uploadsApi.signature();

  // 2. direct upload to Cloudinary
  const form = new FormData();
  form.append('file', blob);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', sig.timestamp);
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Upload failed');
  }
  const out = await res.json();
  return { url: out.secure_url, width: out.width || dims.width, height: out.height || dims.height };
}
