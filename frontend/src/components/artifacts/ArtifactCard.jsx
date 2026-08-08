// components/artifacts/ArtifactCard.jsx
import { useState } from 'react';
import FileViewerModal from '../ui/FileViewerModal';
import s from '../../styles/modules/ArtifactCard.module.css';

const SOURCE_LABEL = { chat: 'Chat', task: 'Task', direct: 'Upload' };

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ArtifactCard({ artifact, canDelete, onDelete }) {
  const isImage = artifact.kind === 'image';
  const [viewing, setViewing] = useState(false);

  return (
    <div className={s.card}>
      {isImage ? (
        <a className={s.preview} href={artifact.url} target="_blank" rel="noreferrer" title={artifact.name}>
          <img src={artifact.url} alt={artifact.name} className={s.thumb} />
        </a>
      ) : (
        <button type="button" className={s.preview} onClick={() => setViewing(true)} title={artifact.name}>
          <span className={s.fileIcon}>📄</span>
        </button>
      )}
      <div className={s.body}>
        <div className={s.nameRow}>
          <span className={s.name} title={artifact.name}>{artifact.name || 'Untitled file'}</span>
          {canDelete && (
            <button className={s.deleteBtn} onClick={onDelete} title="Delete">✕</button>
          )}
        </div>
        <div className={s.meta}>
          <span className={s.badge}>{SOURCE_LABEL[artifact.source] || artifact.source}</span>
          {formatSize(artifact.size) && <span>{formatSize(artifact.size)}</span>}
          {artifact.uploader?.name && <span>{artifact.uploader.name}</span>}
        </div>
        {artifact.tags?.length > 0 && (
          <div className={s.tags}>
            {artifact.tags.map(t => <span key={t} className={s.tag}>{t}</span>)}
          </div>
        )}
      </div>
      {!isImage && (
        <FileViewerModal open={viewing} onClose={() => setViewing(false)} file={artifact} />
      )}
    </div>
  );
}
