// pages/Snippets.jsx
import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useWorkspace } from '../../store/workspace';
import { snippets as snippetsApi, ai as aiApi } from '../../lib/api';
import { useUI } from '../../store/ui';
import { useDebounce } from '../../lib/hooks';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Textarea, Select } from '../../components/ui/Input';
import SnippetCard from '../../components/snippets/SnippetCard';
import s from '../../styles/modules/Snippets.module.css';

const LANGS = ['python', 'java', 'javascript', 'c++', 'go'];

import AiReviewResult from '../../components/ai/AiReviewResult';

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectSnippets() {
  const { canEdit } = useOutletContext() || {};
  const { current: ws, currentProject } = useWorkspace();
  const { toast, confirm } = useUI();
  const [snippets, setSnippets] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [modal, setModal] = useState(false);
  const [editSnippet, setEditSnippet] = useState(null);
  const [aiModal, setAiModal] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ title: '', language: 'javascript', code: '', tags: '', description: '' });
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    if (!currentProject || !ws) return;
    snippetsApi.list(ws._id, currentProject._id)
      .then(({ data }) => setSnippets(data.snippets ?? data))
      .catch(() => toast('Failed to load snippets', 'error'));
  }, [currentProject?._id, ws?._id]);

  const filtered = snippets.filter(sn => {
    const q = debouncedSearch.toLowerCase();
    const matchSearch = !q || sn.title.toLowerCase().includes(q) || sn.tags?.some(t => t.includes(q));
    const matchTag = !filterTag || sn.tags?.includes(filterTag);
    return matchSearch && matchTag;
  });

  const allTags = [...new Set(snippets.flatMap(sn => sn.tags || []))];

  const openCreate = () => {
    setEditSnippet(null);
    setForm({ title: '', language: 'javascript', code: '', tags: '', description: '' });
    setModal(true);
  };

  const openEdit = (sn) => {
    setEditSnippet(sn);
    setForm({ title: sn.title, language: sn.language, code: sn.code, tags: (sn.tags || []).join(', '), description: sn.description || '' });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      if (editSnippet) {
        const { data } = await snippetsApi.update(ws._id, currentProject._id, editSnippet._id, { ...form, tags });
        const updated = data.snippet ?? data;
        setSnippets(s => s.map(sn => sn._id === editSnippet._id ? updated : sn));
        toast('Snippet updated', 'success');
      } else {
        const { data } = await snippetsApi.create(ws._id, currentProject._id, { ...form, tags });
        const created = data.snippet ?? data;
        setSnippets(s => [created, ...s]);
        toast('Snippet saved', 'success');
      }
      setModal(false);
    } catch { toast('Failed to save snippet', 'error'); }
  };

  const handleDelete = async (sn) => {
    if (!(await confirm('Delete this snippet?'))) return;
    await snippetsApi.delete(ws._id, currentProject._id, sn._id);
    setSnippets(s => s.filter(x => x._id !== sn._id));
    toast('Snippet deleted', 'info');
  };

  const runAiReview = async () => {
    if (!aiModal) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data } = await aiApi.review({
        code: aiModal.code,
        language: aiModal.language,
        snippetId: aiModal._id,
        projectId: currentProject._id,
      });
      setAiResult(data);
    } catch (err) {
      setAiResult('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setAiLoading(false);
    }
  };

  if (!currentProject) return <div className={s.empty}>Select a project to view snippets.</div>;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Code Snippets</h1>
        <Button variant="primary" size="sm" onClick={openCreate}>+ New Snippet</Button>
      </div>

      {/* Search + tags */}
      <div className={s.toolbar}>
        <Input placeholder="Search snippets or tags…" value={search} onChange={e => setSearch(e.target.value)} className={s.searchInput} />
        <div className={s.tags}>
          <button className={`${s.tag} ${!filterTag ? s.activeTag : ''}`} onClick={() => setFilterTag('')}>All</button>
          {allTags.map(t => (
            <button key={t} className={`${s.tag} ${filterTag === t ? s.activeTag : ''}`} onClick={() => setFilterTag(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className={s.grid}>
        {filtered.length === 0 && <p className={s.empty}>No snippets found.</p>}
        {filtered.map(sn => (
          <SnippetCard
            key={sn._id}
            snippet={sn}
            onDelete={() => handleDelete(sn)}
            onEdit={() => openEdit(sn)}
            onAiReview={() => { setAiModal(sn); setAiResult(null); }}
          />
        ))}
      </div>

      {/* Create / Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editSnippet ? 'Edit Snippet' : 'New Snippet'} size="lg">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Title" placeholder="Auth middleware example" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Select label="Language" value={form.language}
            onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
            options={LANGS} />
          <Input label="Tags (comma separated)" placeholder="auth, middleware, jwt"
            value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          <Textarea label="Description" placeholder="What does this snippet do?"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Textarea label="Code" placeholder="Paste your code here…"
            value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            required style={{ fontFamily: 'var(--font-mono)', fontSize: 13, minHeight: 200 }} />
          <Button type="submit" variant="cyan" size="md">{editSnippet ? 'Update Snippet' : 'Save Snippet'}</Button>
        </form>
      </Modal>

      {/* AI Review modal */}
      <Modal open={!!aiModal} onClose={() => setAiModal(null)} title="AI Code Review" size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Code preview */}
          <div style={{
            background: 'var(--bg-2)', borderRadius: 8, padding: '12px 16px',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)',
            maxHeight: 180, overflow: 'auto',
          }}>
            <pre style={{ margin: 0 }}>{aiModal?.code}</pre>
          </div>

          {/* States */}
          {!aiResult && !aiLoading && (
            <Button variant="primary" size="md" onClick={runAiReview}>Run AI Review</Button>
          )}

          {aiLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
              <div style={{
                width: 36, height: 36, border: '3px solid var(--bg-3)',
                borderTop: '3px solid var(--accent, #6c63ff)',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>Reviewing your code…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Beautiful review result */}
          {aiResult && !aiLoading && (
            <>
              <AiReviewResult data={aiResult} />
              <Button variant="ghost" size="sm" onClick={runAiReview}>Re-run review</Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}