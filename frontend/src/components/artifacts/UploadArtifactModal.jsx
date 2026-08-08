// components/artifacts/UploadArtifactModal.jsx — 2-step wizard: pick+upload a
// file, then optionally tag it before it's saved as an Artifact.
import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import TagPicker from './TagPicker';
import { isImage, uploadImage, uploadFile } from '../../lib/upload';
import s from '../../styles/modules/UploadArtifactModal.module.css';

export default function UploadArtifactModal({ open, onClose, onCreate, availableTags = [] }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(null); // { url, key, name, size, mimeType, kind }
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');

  const reset = () => {
    setFile(null); setProgress(0); setUploading(false);
    setUploaded(null); setTags([]); setError('');
  };

  const close = () => { reset(); onClose(); };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');
    setUploading(true);
    try {
      const result = isImage(f)
        ? await uploadImage(f, { onProgress: setProgress })
        : await uploadFile(f, { onProgress: setProgress });
      setUploaded({
        url: result.url,
        key: result.key,
        name: f.name,
        size: f.size,
        mimeType: f.type,
        kind: isImage(f) ? 'image' : 'file',
      });
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!uploaded) return;
    await onCreate({ ...uploaded, tags });
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Upload artifact" size="md">
      <div className={s.body}>
        {!uploaded && (
          <>
            <input type="file" onChange={handleFileChange} disabled={uploading} />
            {uploading && (
              <div className={s.progressTrack}>
                <div className={s.progressFill} style={{ width: `${progress}%` }} />
              </div>
            )}
            {error && <p className={s.error}>{error}</p>}
          </>
        )}

        {uploaded && (
          <>
            <p className={s.fileDone}>✓ {uploaded.name}</p>
            <div>
              <p className={s.tagsLabel}>Tags (optional)</p>
              <TagPicker availableTags={availableTags} selected={tags} onChange={setTags} />
            </div>
            <div className={s.actions}>
              <Button variant="ghost" size="sm" onClick={reset}>Choose a different file</Button>
              <Button variant="primary" size="sm" onClick={handleConfirm}>Add to Artifacts</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
