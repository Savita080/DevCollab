// pages/project/ProjectArtifacts.jsx
import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useWorkspace } from '../../store/workspace';
import { artifacts as artifactsApi } from '../../lib/api';
import { useUI } from '../../store/ui';
import { useDebounce } from '../../lib/hooks';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ArtifactCard from '../../components/artifacts/ArtifactCard';
import UploadArtifactModal from '../../components/artifacts/UploadArtifactModal';
import s from '../../styles/modules/ProjectArtifacts.module.css';

export default function ProjectArtifacts() {
  const { canEdit } = useOutletContext() || {};
  const { current: ws, currentProject } = useWorkspace();
  const { toast, confirm } = useUI();
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [modal, setModal] = useState(false);
  const debouncedSearch = useDebounce(search);

  const load = () => {
    if (!currentProject || !ws) return;
    artifactsApi.list(ws._id, currentProject._id)
      .then(({ data }) => setList(data.artifacts ?? data))
      .catch(() => toast('Failed to load artifacts', 'error'));
  };

  useEffect(() => { load(); }, [currentProject?._id, ws?._id]);

  const filtered = list.filter(a => {
    const q = debouncedSearch.toLowerCase();
    const matchSearch = !q || a.name?.toLowerCase().includes(q) || a.tags?.some(t => t.includes(q));
    const matchTag = !filterTag || a.tags?.includes(filterTag);
    return matchSearch && matchTag;
  });

  const allTags = [...new Set(list.flatMap(a => a.tags || []))];

  const handleCreate = async (payload) => {
    try {
      const { data } = await artifactsApi.create(ws._id, currentProject._id, payload);
      const created = data.artifact ?? data;
      setList(l => [created, ...l]);
      toast('Artifact added', 'success');
    } catch {
      toast('Failed to save artifact', 'error');
    }
  };

  const handleDelete = async (artifact) => {
    if (!(await confirm('Delete this artifact?'))) return;
    try {
      await artifactsApi.delete(ws._id, currentProject._id, artifact._id);
      setList(l => l.filter(a => a._id !== artifact._id));
      toast('Artifact deleted', 'info');
    } catch {
      toast('Failed to delete artifact', 'error');
    }
  };

  if (!currentProject) return <div className={s.empty}>Select a project to view artifacts.</div>;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Artifacts</h1>
        {canEdit && <Button variant="primary" size="sm" onClick={() => setModal(true)}>+ Upload</Button>}
      </div>

      <div className={s.toolbar}>
        <Input placeholder="Search files or tags…" value={search} onChange={e => setSearch(e.target.value)} className={s.searchInput} />
        <div className={s.tags}>
          <button className={`${s.tag} ${!filterTag ? s.activeTag : ''}`} onClick={() => setFilterTag('')}>All</button>
          {allTags.map(t => (
            <button key={t} className={`${s.tag} ${filterTag === t ? s.activeTag : ''}`} onClick={() => setFilterTag(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className={s.grid}>
        {filtered.length === 0 && <p className={s.empty}>No artifacts found.</p>}
        {filtered.map(a => (
          <ArtifactCard
            key={a._id}
            artifact={a}
            canDelete={canEdit}
            onDelete={() => handleDelete(a)}
          />
        ))}
      </div>

      <UploadArtifactModal
        open={modal}
        onClose={() => setModal(false)}
        onCreate={handleCreate}
        availableTags={allTags}
      />
    </div>
  );
}
