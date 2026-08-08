// components/ui/FileViewerModal.jsx — WhatsApp-style full-screen file opener:
// click a file attachment and it opens HERE for reading (own toolbar, zoom,
// page nav via pdf.js), never auto-downloads. Downloading is a separate,
// explicit action.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { renderAsync as renderDocx } from 'docx-preview';
import * as XLSX from 'xlsx';
import { loadPresentation, renderSlideToElement } from 'pptx-viewer';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, Maximize, Minimize } from 'lucide-react';
import { uploads as uploadsApi } from '../../lib/api';
import s from '../../styles/modules/FileViewerModal.module.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function isPdf(mimeType, name) {
  return mimeType === 'application/pdf' || /\.pdf$/i.test(name || '');
}

// Plain-text formats the browser can just display as text — no dedicated
// renderer needed. Formats with no client-side renderer at all (zip, legacy
// .doc/.ppt, ...) fall back to a "no preview" panel.
function isText(mimeType, name) {
  if (mimeType?.startsWith('text/')) return true;
  if (mimeType === 'application/json') return true;
  return /\.(txt|md|csv|log|json)$/i.test(name || '');
}

function isDocx(mimeType, name) {
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return true;
  return /\.docx$/i.test(name || '');
}

function isXlsx(mimeType, name) {
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return true;
  if (mimeType === 'application/vnd.ms-excel') return true;
  return /\.(xlsx|xls)$/i.test(name || '');
}

function isPptx(mimeType, name) {
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return true;
  return /\.pptx$/i.test(name || '');
}

function fmtBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export default function FileViewerModal({ open, onClose, file }) {
  const [viewUrl, setViewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [zoomIdx, setZoomIdx] = useState(2); // 1x
  const [sheets, setSheets] = useState(null); // xlsx: [{ name, html }]
  const [activeSheet, setActiveSheet] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pptxSize, setPptxSize] = useState(null); // { width, height } in px, at 1x zoom
  const docxContainerRef = useRef(null);
  const overlayRef = useRef(null);
  const pdfScrollRef = useRef(null);
  const pageEls = useRef([]); // pdf/pptx: page number -> page wrapper DOM node (IntersectionObserver targets)
  const slideEls = useRef([]); // pptx: slide index -> inner SVG host (render targets)
  const pptxRef = useRef(null); // pptx-viewer's LoadedPresentation, kept for cleanup() + slide count
  const pptxScrollRef = useRef(null);

  const pdf = file ? isPdf(file.mimeType, file.name) : false;
  const text = file ? isText(file.mimeType, file.name) : false;
  const docx = file ? isDocx(file.mimeType, file.name) : false;
  const xlsx = file ? isXlsx(file.mimeType, file.name) : false;
  const pptx = file ? isPptx(file.mimeType, file.name) : false;
  const previewable = pdf || text || docx || xlsx || pptx;

  // PDF/text just need a URL (iframe/pdf.js fetch it themselves). docx/xlsx
  // need the raw bytes to parse client-side, so those two also grab a Blob.
  useEffect(() => {
    if (!open || !file || !previewable) return;
    setLoading(true);
    setError('');
    setViewUrl(null);
    setNumPages(0);
    setPageNum(1);
    setZoomIdx(2);
    setSheets(null);
    setActiveSheet(0);
    setPptxSize(null);

    uploadsApi.access(file.url, { filename: file.name, disposition: 'inline' })
      .then(async ({ data }) => {
        if (docx) {
          const resp = await fetch(data.url);
          const blob = await resp.blob();
          if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = '';
            await renderDocx(blob, docxContainerRef.current, undefined, { inWrapper: true });
          }
        } else if (xlsx) {
          const resp = await fetch(data.url);
          const buf = await resp.arrayBuffer();
          const wb = XLSX.read(buf, { type: 'array' });
          setSheets(wb.SheetNames.map(name => ({
            name,
            html: XLSX.utils.sheet_to_html(wb.Sheets[name], { editable: false }),
          })));
        } else if (pptx) {
          const resp = await fetch(data.url);
          const buf = await resp.arrayBuffer();
          pptxRef.current?.cleanup?.();
          const presentation = await loadPresentation(buf);
          pptxRef.current = presentation;
          pageEls.current = new Array(presentation.slides.length).fill(null);
          slideEls.current = new Array(presentation.slides.length).fill(null);
          setNumPages(presentation.slides.length);
        } else {
          setViewUrl(data.url);
        }
      })
      .catch(() => setError('Could not load preview'))
      .finally(() => setLoading(false));
  }, [open, file, previewable]);

  // Compute each slide's target pixel size once the presentation is loaded.
  // Stored in state (not set imperatively on the DOM) because the slide
  // divs also carry a `transform: scale()` style for zoom — if width/height
  // were set via el.style.* instead, React would clobber them on every
  // re-render (state updates, scroll-driven pageNum changes, ...) since JSX
  // replaces the whole `style` object each render. That's what produced the
  // blank/zero-height slide bars: the container collapsed back to 0 the
  // instant anything else re-rendered, clipping the already-rendered SVG.
  useEffect(() => {
    if (!pptx || !pptxRef.current || !numPages) return;
    const { width, height } = pptxRef.current.slideSize;
    const targetWidth = 900;
    setPptxSize({ width: targetWidth, height: Math.round((targetWidth / width) * height) });
  }, [pptx, numPages]);

  // Render each slide into its own container once both the DOM nodes and
  // the target size exist. pptx-viewer has no built-in "render all slides"
  // call — renderSlideToElement targets one container at a time, so this
  // loops over every mounted slide div. Runs once per load (not on every
  // zoom change) — renderSlideToElement bakes width/height into the SVG's
  // own attributes; zoom is applied on top via CSS transform, not re-render.
  useEffect(() => {
    if (!pptx || !pptxRef.current || !numPages || !pptxSize) return;
    for (let i = 0; i < numPages; i++) {
      const el = slideEls.current[i];
      if (el) renderSlideToElement(pptxRef.current, i, el, pptxSize);
    }
  }, [pptx, numPages, pptxSize]);

  // Track which page is centered in the scroll viewport (a real PDF/PPTX
  // viewer scrolls through pages continuously — it doesn't swap a single
  // mounted page per click). IntersectionObserver flips pageNum as pages
  // cross the viewport; next/prev buttons scroll to the target page instead
  // of swapping which page is rendered.
  useEffect(() => {
    const root = pdf ? pdfScrollRef.current : pptx ? pptxScrollRef.current : null;
    if (!(pdf || pptx) || !numPages || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (!visible.length) return;
        const top = visible.reduce((a, b) => (a.intersectionRatio > b.intersectionRatio ? a : b));
        const n = Number(top.target.dataset.pageNumber);
        if (n) setPageNum(n);
      },
      { root, threshold: [0.25, 0.5, 0.75] },
    );
    pageEls.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pdf, pptx, numPages]);

  // pptx-viewer's LoadedPresentation holds blob URLs for embedded images —
  // release them when the viewer closes or a different file is opened.
  useEffect(() => {
    return () => { pptxRef.current?.cleanup?.(); pptxRef.current = null; };
  }, [open, file]);

  const scrollToPage = (n) => {
    pageEls.current[n - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Esc closes, like every other modal in the app — but let the browser's
  // own fullscreen-exit handle Esc first when we're in fullscreen (it fires
  // a fullscreenchange instead), otherwise both would race on the same key.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !document.fullscreenElement) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Leaving fullscreen (however it happens — Esc, browser chrome, etc.)
  // shouldn't leave a stale flag once the viewer itself closes.
  useEffect(() => {
    if (!open && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, [open]);

  if (!open || !file) return null;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      overlayRef.current?.requestFullscreen().catch(() => {});
    }
  };

  const handleDownload = async () => {
    try {
      const { data } = await uploadsApi.access(file.url, { filename: file.name, disposition: 'download' });
      window.location.href = data.url;
    } catch {
      window.open(file.url, '_blank');
    }
  };

  const zoom = ZOOM_STEPS[zoomIdx];
  const zoomIn = () => setZoomIdx(i => Math.min(i + 1, ZOOM_STEPS.length - 1));
  const zoomOut = () => setZoomIdx(i => Math.max(i - 1, 0));

  return createPortal(
    <div className={s.overlay} ref={overlayRef}>
      <div className={s.header}>
        <div className={s.headerLeft}>
          <FileText size={18} />
          <div>
            <div className={s.headerName}>{file.name || 'File'}</div>
            {fmtBytes(file.size) && <div className={s.headerMeta}>{fmtBytes(file.size)}</div>}
          </div>
        </div>

        <div className={s.headerCenter}>
          {(pdf || pptx) && numPages > 0 && (
            <>
              <button className={s.iconBtn} onClick={() => scrollToPage(Math.max(1, pageNum - 1))} disabled={pageNum <= 1} title="Previous page">
                <ChevronLeft size={16} />
              </button>
              <span className={s.pageIndicator}>{pageNum} / {numPages}</span>
              <button className={s.iconBtn} onClick={() => scrollToPage(Math.min(numPages, pageNum + 1))} disabled={pageNum >= numPages} title="Next page">
                <ChevronRight size={16} />
              </button>
              <span className={s.divider} />
            </>
          )}
          {(pdf || docx || xlsx || pptx) && (
            <>
              <button className={s.iconBtn} onClick={zoomOut} disabled={zoomIdx === 0} title="Zoom out">
                <ZoomOut size={16} />
              </button>
              <span className={s.zoomIndicator}>{Math.round(zoom * 100)}%</span>
              <button className={s.iconBtn} onClick={zoomIn} disabled={zoomIdx === ZOOM_STEPS.length - 1} title="Zoom in">
                <ZoomIn size={16} />
              </button>
            </>
          )}
          {xlsx && sheets?.length > 1 && (
            <>
              <span className={s.divider} />
              <div className={s.sheetTabs}>
                {sheets.map((sh, i) => (
                  <button
                    key={sh.name}
                    className={`${s.sheetTab} ${i === activeSheet ? s.sheetTabActive : ''}`}
                    onClick={() => setActiveSheet(i)}
                  >
                    {sh.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={s.headerRight}>
          <button className={s.iconBtn} onClick={handleDownload} title="Download">
            <Download size={18} />
          </button>
          <button className={s.iconBtn} onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          <button className={s.iconBtn} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className={s.stage}>
        {previewable && loading && <p className={s.status}>Loading preview…</p>}
        {previewable && error && <p className={s.status}>{error}</p>}

        {pdf && viewUrl && !loading && !error && (
          <div className={s.pdfScroll} ref={pdfScrollRef}>
            <Document
              file={viewUrl}
              onLoadSuccess={({ numPages }) => {
                pageEls.current = new Array(numPages).fill(null);
                setNumPages(numPages);
              }}
              onLoadError={() => setError('Could not render this PDF')}
              loading={<p className={s.status}>Rendering…</p>}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i + 1} ref={el => { pageEls.current[i] = el; }} data-page-number={i + 1} className={s.pdfPage}>
                  <Page pageNumber={i + 1} scale={zoom} />
                </div>
              ))}
            </Document>
          </div>
        )}

        {text && viewUrl && !loading && !error && (
          <iframe src={viewUrl} title={file.name || 'file preview'} className={s.textFrame} />
        )}

        {docx && !error && (
          <div className={s.docxScroll} style={{ display: loading ? 'none' : 'block' }}>
            <div ref={docxContainerRef} className={s.docxContainer} style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }} />
          </div>
        )}

        {xlsx && sheets && !loading && !error && (
          <div className={s.xlsxScroll}>
            <div
              className={s.xlsxZoomLayer}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: sheets[activeSheet]?.html || '' }}
            />
          </div>
        )}

        {pptx && !loading && !error && numPages > 0 && pptxSize && (
          <div className={s.pdfScroll} ref={pptxScrollRef}>
            <div className={s.pptxStack}>
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i + 1}
                  ref={el => { pageEls.current[i] = el; }}
                  data-page-number={i + 1}
                  className={s.pptxSlideBox}
                  style={{ width: pptxSize.width * zoom, height: pptxSize.height * zoom }}
                >
                  <div
                    ref={el => { slideEls.current[i] = el; }}
                    className={s.pptxSlide}
                    style={{
                      width: pptxSize.width,
                      height: pptxSize.height,
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {!previewable && (
          <div className={s.noPreview}>
            <FileText size={40} />
            <p className={s.noPreviewText}>No preview available for this file type.</p>
            <p className={s.meta}>{file.name} {fmtBytes(file.size) && `· ${fmtBytes(file.size)}`}</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
