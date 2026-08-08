// pages/Wiki.jsx
import { useOutletContext } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useWorkspace } from '../../store/workspace';
import { wiki as wikiApi } from '../../lib/api';
import { useUI } from '../../store/ui';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import WikiEditor from '../../components/wiki/WikiEditor';
import WikiHistoryModal from '../../components/wiki/WikiHistoryModal';
import s from '../../styles/modules/Wiki.module.css';

import WikiFolderTree from '../../components/wiki/WikiFolderTree';
import PageLinkPicker from '../../components/wiki/PageLinkPicker';
import SectionLinkModal from '../../components/wiki/SectionLinkModal';
import { PrevNextModal, PrevNextBar } from '../../components/wiki/PrevNextControls';

// ─── Main Wiki component ──────────────────────────────────────────────────────

export default function ProjectWiki() {
  const { canEdit } = useOutletContext() || {};
  const { current: ws, currentProject } = useWorkspace();
  const { toast, confirm } = useUI();

  // Pages & active state
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [activeContent, setActiveContent] = useState('');

  // Folders
  const [folders, setFolders] = useState([]);
  const [newFolderParent, setNewFolderParent] = useState(undefined);
  const [newFolderName, setNewFolderName] = useState('');

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFolderId, setNewFolderId] = useState('');
  const [historyModal, setHistoryModal] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [commitModal, setCommitModal] = useState(false);
  const [pendingContent, setPendingContent] = useState(null);
  const [commitMsg, setCommitMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Rename title
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [newTitleEdit, setNewTitleEdit] = useState('');

  // Prev/Next modal
  const [prevNextModal, setPrevNextModal] = useState(false);

  // Section-link modal
  const [sectionLinkModal, setSectionLinkModal] = useState(false);

  // @-mention picker state (controlled from outside WikiEditor via a ref/callback)
  const [mentionState, setMentionState] = useState(null); // { query, position } | null
  const mentionInsertRef = useRef(null); // callback to insert the chosen link into editor

  // ── data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentProject || !ws) return;

    // Load pages
    wikiApi.pages(ws._id, currentProject._id).then(({ data }) => {
      const list = data.pages ?? data;
      setPages(list);
      if (list.length) loadPage(list[0]);
    });

    // Load folders
    loadFolders();
  }, [currentProject?._id, ws?._id]);

  const loadFolders = async () => {
    try {
      const { data } = await wikiApi.folders(ws._id, currentProject._id);
      setFolders(data.folders ?? data);
    } catch { /* folders endpoint may not exist yet */ }
  };

  const loadPage = async (pg) => {
    setActivePage(pg);
    try {
      const { data } = await wikiApi.get(ws._id, currentProject._id, pg._id);
      const full = data.page ?? data;
      setActivePage(full); // includes populated prevPage / nextPage
      setActiveContent(full.content || '');
    } catch {
      setActiveContent(pg.content || '');
    }
  };

  // ── page CRUD ────────────────────────────────────────────────────────────────

  const createPage = async (e) => {
    e.preventDefault();
    try {
      const { data } = await wikiApi.create(ws._id, currentProject._id, { title: newTitle, content: '', folderId: newFolderId || null });
      const page = data.page ?? data;
      setPages(p => [page, ...p]);
      setActivePage(page);
      setActiveContent('');
      setCreateModal(false);
      setNewTitle('');
      setNewFolderId('');
      toast('Page created', 'success');
    } catch { toast('Failed to create page', 'error'); }
  };

  const requestSave = (content) => {
    if (content === activeContent) { toast('No changes to save', 'info'); return; }
    setPendingContent(content);
    setCommitMsg('');
    setCommitModal(true);
  };

  const savePage = async (content, commitMessage) => {
    if (commitMessage.length < 10) { toast('Commit message must be at least 10 characters', 'error'); return false; }
    setSaving(true);
    try {
      await wikiApi.update(ws._id, currentProject._id, activePage._id, { content, commitMessage });
      setActiveContent(content);
      setPages(p => p.map(pg => pg._id === activePage._id ? { ...pg, content } : pg));
      setCommitModal(false);
      setPendingContent(null);
      toast('Saved ✓', 'success');
      return true;
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to save', 'error');
      return false;
    } finally { setSaving(false); }
  };

  const handleCommitSave = async (e) => {
    e.preventDefault();
    if (pendingContent !== null) await savePage(pendingContent, commitMsg);
  };

  const deletePage = async (pg) => {
    if (!(await confirm(`Delete page "${pg.title}"?`))) return;
    try {
      await wikiApi.delete(ws._id, currentProject._id, pg._id);
      const remaining = pages.filter(p => p._id !== pg._id);
      setPages(remaining);
      if (activePage?._id === pg._id) {
        if (remaining.length) loadPage(remaining[0]);
        else { setActivePage(null); setActiveContent(''); }
      }
      toast('Page deleted', 'info');
    } catch { toast('Failed to delete page', 'error'); }
  };

  const handleRenameTitle = async (e) => {
    e.preventDefault();
    if (!newTitleEdit.trim() || !activePage) return;
    try {
      await wikiApi.update(ws._id, currentProject._id, activePage._id, { title: newTitleEdit.trim() });
      const updated = { ...activePage, title: newTitleEdit.trim() };
      setActivePage(updated);
      setPages(p => p.map(pg => pg._id === activePage._id ? updated : pg));
      setRenamingTitle(false);
      toast('Page renamed', 'success');
    } catch { toast('Failed to rename page', 'error'); }
  };

  // ── history ──────────────────────────────────────────────────────────────────

  const openHistory = async () => {
    if (!activePage) return;
    setHistoryModal(true);
    setLoadingVersions(true);
    try {
      const { data } = await wikiApi.versions(ws._id, currentProject._id, activePage._id);
      setVersions(data.versions ?? data);
    } catch { toast('Failed to load history', 'error'); }
    finally { setLoadingVersions(false); }
  };

  const restoreVersion = async (version, commitMessage) => {
    const ok = await savePage(version.content || '', commitMessage);
    if (ok) { setHistoryModal(false); toast('Version restored', 'success'); }
  };

  // ── folder operations ────────────────────────────────────────────────────────

  const createFolder = async (name, parentId) => {
    if (!name.trim()) return;
    try {
      const { data } = await wikiApi.createFolder(ws._id, currentProject._id, { name, parentId: parentId || null });
      setFolders(f => [...f, data.folder ?? data]);
      toast('Folder created', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to create folder', 'error');
    }
  };

  const renameFolder = async (folderId, name) => {
    try {
      const { data } = await wikiApi.updateFolder(ws._id, currentProject._id, folderId, { name });
      setFolders(f => f.map(ff => ff._id === folderId ? (data.folder ?? data) : ff));
      toast('Folder renamed', 'success');
    } catch { toast('Failed to rename folder', 'error'); }
  };

  const deleteFolder = async (folderId) => {
    if (!(await confirm('Delete folder? Pages inside will be moved to root.'))) return;
    try {
      await wikiApi.deleteFolder(ws._id, currentProject._id, folderId);
      setFolders(f => f.filter(ff => ff._id !== folderId));
      // Move affected pages to root in local state
      setPages(p => p.map(pg => String(pg.folder) === String(folderId) ? { ...pg, folder: null } : pg));
      toast('Folder deleted', 'info');
    } catch { toast('Failed to delete folder', 'error'); }
  };

  const movePage = async (pageId, folderId) => {
    try {
      await wikiApi.move(ws._id, currentProject._id, pageId, { folderId: folderId || null });
      setPages(p => p.map(pg => pg._id === pageId ? { ...pg, folder: folderId || null } : pg));
    } catch { toast('Failed to move page', 'error'); }
  };

  // ── prev/next assignment ─────────────────────────────────────────────────────

  const savePrevNext = async (prevId, nextId) => {
    try {
      await wikiApi.update(ws._id, currentProject._id, activePage._id, {
        prevPage: prevId || null,
        nextPage: nextId || null,
        // No commitMessage needed — backend allows title/nav updates without one
      });
      const updated = {
        ...activePage,
        prevPage: prevId ? pages.find(p => p._id === prevId) || prevId : null,
        nextPage: nextId ? pages.find(p => p._id === nextId) || nextId : null,
      };
      setActivePage(updated);
      setPages(p => p.map(pg => pg._id === activePage._id ? updated : pg));
      toast('Navigation links saved', 'success');
    } catch { toast('Failed to save navigation links', 'error'); }
  };

  // ── section link insertion ───────────────────────────────────────────────────
  // WikiEditor exposes an `insertLink(href, text)` imperative handle.
  // We store a ref to that and call it after SectionLinkModal resolves.

  const editorRef = useRef(null);

  const handleSectionLinkInsert = ({ pageId, anchor, pageTitle }) => {
    const href = `/wiki/${pageId}${anchor}`;
    // editorRef.current is the WikiEditor instance that exposes insertLink
    if (editorRef.current?.insertLink) {
      editorRef.current.insertLink(href, pageTitle + (anchor ? ` › ${anchor.slice(1)}` : ''));
    }
  };

  // ── @-mention wiring ─────────────────────────────────────────────────────────
  // WikiEditor calls these via props when "@" is typed / dismissed.

  const onMentionOpen = useCallback((query, position, insertFn) => {
    setMentionState({ query, position });
    mentionInsertRef.current = insertFn;
  }, []);

  const onMentionQuery = useCallback((query) => {
    setMentionState(s => s ? { ...s, query } : null);
  }, []);

  const onMentionClose = useCallback(() => {
    setMentionState(null);
    mentionInsertRef.current = null;
  }, []);

  const handleMentionSelect = (page) => {
    if (mentionInsertRef.current) {
      mentionInsertRef.current(`[${page.title}](/wiki/${page._id})`);
    }
    setMentionState(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (!currentProject) return <div className={s.empty}>Select a project to view the wiki.</div>;

  return (
    <div className={s.page}>

      {/* ── Sidebar ── */}
      <aside className={s.sidebar}>
        <div className={s.sideHeader}>
          <span className={s.sideTitle}>Pages</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={s.miniIconBtn} onClick={() => setCreateModal(true)} title="New page">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 1.5h6l3 3v8a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" stroke="currentColor" strokeLinejoin="round"/>
                <path d="M7 6v5M4.5 8.5h5" stroke="currentColor" strokeLinecap="round"/>
              </svg>
            </button>
            <button className={s.miniIconBtn} onClick={() => { setNewFolderParent(null); setNewFolderName(''); }} title="New folder">
              <svg width="15" height="14" viewBox="0 0 15 14" fill="none">
                <path d="M1.5 3h4l1.5-2h6.5a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeLinejoin="round"/>
                <path d="M7.5 6v5M5 8.5h5" stroke="currentColor" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <WikiFolderTree
          folders={folders}
          pages={pages}
          activePage={activePage}
          onPageClick={loadPage}
          onDeletePage={deletePage}
          onCreateFolder={createFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onMovePage={movePage}
          newFolderParent={newFolderParent}
          setNewFolderParent={setNewFolderParent}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
        />
      </aside>

      {/* ── Editor area ── */}
      <main className={s.editor} style={{ position: 'relative' }}>
        {activePage ? (
          <>
            {/* toolbar */}
            <div className={s.editorToolbar}>
              {renamingTitle ? (
                <form onSubmit={handleRenameTitle} className={s.renameForm}>
                  <input className={s.renameTitleInput} value={newTitleEdit} onChange={e => setNewTitleEdit(e.target.value)} autoFocus required />
                  <Button type="submit" variant="primary" size="sm">Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setRenamingTitle(false)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <h2 className={s.pageTitle}>{activePage.title}</h2>
                  <button className={s.renameBtn} onClick={() => { setNewTitleEdit(activePage.title); setRenamingTitle(true); }} title="Rename page">✏</button>
                </>
              )}

              <div className={s.toolbarRight}>
                {/* Prev/Next assignment button */}
                <button className={s.navLinksBtn} onClick={() => setPrevNextModal(true)} title="Set prev / next pages">
                  ⇄ Nav links
                </button>
                {/* Section link button */}
                <button className={s.sectionLinkBtn} onClick={() => setSectionLinkModal(true)} title="Insert link to page section">
                  🔗 Section link
                </button>
                <button className={s.historyBtn} onClick={openHistory} title="Version history">⏱ History</button>
              </div>
            </div>

            {/* Prev/Next navigation bar */}
            <PrevNextBar activePage={activePage} pages={pages} onNavigate={loadPage} />

            {/* Editor */}
            <WikiEditor
              ref={editorRef}
              page={{ ...activePage, content: activeContent }}
              onSave={requestSave}
              // @-mention props — pass these only if WikiEditor supports them
              onMentionOpen={onMentionOpen}
              onMentionQuery={onMentionQuery}
              onMentionClose={onMentionClose}
              // Internal page link click handler
              onInternalLinkClick={(pageId) => {
                const target = pages.find(p => p._id === pageId);
                if (target) loadPage(target);
              }}
            />

            {/* @-mention picker (floating) */}
            {mentionState && (
              <PageLinkPicker
                pages={pages}
                query={mentionState.query}
                position={mentionState.position}
                onSelect={handleMentionSelect}
                onClose={onMentionClose}
              />
            )}
          </>
        ) : (
          <div className={s.empty}>Select a page or create one to start writing.</div>
        )}
      </main>

      {/* ── Modals ── */}

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="New Wiki Page" size="sm">
        <form onSubmit={createPage} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Page title" placeholder="Getting Started" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
          <div>
            <label className={s.formLabel}>Folder (optional)</label>
            <select className={s.select} value={newFolderId} onChange={e => setNewFolderId(e.target.value)}>
              <option value="">— root —</option>
              {folders.map(f => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="primary" size="md">Create Page</Button>
        </form>
      </Modal>

      <Modal open={commitModal} onClose={() => setCommitModal(false)} title="Save with Commit Message" size="sm">
        <form onSubmit={handleCommitSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
            Describe what changed in this save (min. 10 characters — saved to version history).
          </p>
          <Input label="Commit message" placeholder="Fixed typo in setup section" value={commitMsg} onChange={e => setCommitMsg(e.target.value)} required />
          <Button type="submit" variant="primary" size="md" loading={saving} disabled={commitMsg.length < 10}>Save Page</Button>
        </form>
      </Modal>

      <WikiHistoryModal
        open={historyModal}
        onClose={() => setHistoryModal(false)}
        pageTitle={activePage?.title}
        versions={versions}
        loading={loadingVersions}
        saving={saving}
        onRestore={restoreVersion}
      />

      <PrevNextModal
        open={prevNextModal}
        onClose={() => setPrevNextModal(false)}
        pages={pages}
        activePage={activePage}
        onSave={savePrevNext}
      />

      <SectionLinkModal
        open={sectionLinkModal}
        onClose={() => setSectionLinkModal(false)}
        pages={pages}
        currentPageId={activePage?._id}
        onInsert={handleSectionLinkInsert}
      />
    </div>
  );
}