// components/artifacts/ArtifactCard.jsx
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

  return (
    <div className={s.card}>
      <a className={s.preview} href={artifact.url} target="_blank" rel="noreferrer" title={artifact.name}>
        {isImage
          ? <img src={artifact.url} alt={artifact.name} className={s.thumb} />
          : <span className={s.fileIcon}>📄</span>}
      </a>
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
    </div>
  );
}
