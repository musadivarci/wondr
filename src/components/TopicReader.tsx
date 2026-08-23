import { useEffect, useState } from 'react'
import type { Highlight, Note, StudyHistory, StudyItem, Topic } from '../types'
import { createQuickNoteFromText } from '../services/quickNotes'

type TopicReaderProps = {
  topic: Topic
  topics: Topic[]
  onBack: () => void
  onEdit: (topicId: string) => void
  onAddStudyItem: (text: string, sourceExcerpt: string) => void
  onAddHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void
  onRemoveHighlight: (highlightId: string) => void
  studyHistory: StudyHistory[]
  highlights: Highlight[]
  notes: Note[]
  studyItems: StudyItem[]
  onOpenTopic: (topicId: string) => void
  onArchive: (topicId: string) => void
  onDelete: (topicId: string) => void
  onCreateNote: (content: string, topicId: string) => void
  onUpdateNote: (noteId: string, content: string) => void
  onDeleteNote: (noteId: string) => void
}

function topicNames(ids: string[], topics: Topic[]) {
  return ids.map((id) => topics.find((topic) => topic.id === id)?.title).filter((title): title is string => Boolean(title))
}

function textOffset(root: Node, target: Node, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  let total = 0
  while (current) {
    if (current === target) return total + offset
    total += current.textContent?.length ?? 0
    current = walker.nextNode()
  }
  return total
}

function highlightRanges(text: string, highlights: Highlight[]) {
  return highlights.map((highlight) => {
    const atOffset = text.slice(highlight.startOffset, highlight.endOffset) === highlight.selectedText ? highlight.startOffset : -1
    const contextStart = Math.max(0, highlight.startOffset - (highlight.contextBefore?.length ?? 0))
    const context = `${highlight.contextBefore ?? ''}${highlight.selectedText}${highlight.contextAfter ?? ''}`
    const fallback = context ? text.indexOf(context, contextStart) : -1
    const start = atOffset >= 0 ? atOffset : fallback >= 0 ? fallback + (highlight.contextBefore?.length ?? 0) : text.indexOf(highlight.selectedText)
    return start >= 0 ? { highlight, start, end: start + highlight.selectedText.length } : null
  }).filter((range): range is { highlight: Highlight; start: number; end: number } => Boolean(range)).sort((first, second) => first.start - second.start)
}

function renderMarkedText(text: string, ranges: ReturnType<typeof highlightRanges>, offset: number, onHighlightClick: (event: React.MouseEvent<HTMLElement>, highlight: Highlight) => void) {
  const visibleRanges = ranges.filter((range) => range.end > offset && range.start < offset + text.length)
  if (visibleRanges.length === 0) return text
  const parts: React.ReactNode[] = []
  let cursor = 0
  visibleRanges.forEach((range) => {
    const start = Math.max(0, range.start - offset)
    const end = Math.min(text.length, range.end - offset)
    if (start < cursor) return
    parts.push(text.slice(cursor, start), <mark className="note-highlight" key={range.highlight.id} data-highlight-id={range.highlight.id} onClick={(event) => onHighlightClick(event, range.highlight)}>{text.slice(start, end)}</mark>)
    cursor = end
  })
  parts.push(text.slice(cursor))
  return parts
}

export function TopicReader({ topic, topics, onBack, onEdit, onAddStudyItem, onAddHighlight, onRemoveHighlight, studyHistory, highlights, notes, studyItems, onOpenTopic, onArchive, onDelete, onCreateNote, onUpdateNote, onDeleteNote }: TopicReaderProps) {
  const [selection, setSelection] = useState<{ text: string; top: number; left: number; startOffset: number; endOffset: number } | null>(null)
  const [activeHighlight, setActiveHighlight] = useState<{ id: string; top: number; left: number } | null>(null)
  const [noteDraft, setNoteDraft] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [readerProgress, setReaderProgress] = useState(0)
  const [notesOpen, setNotesOpen] = useState(false)
  const [studyItemsOpen, setStudyItemsOpen] = useState(false)
  const [notePanelOpen, setNotePanelOpen] = useState(false)
  const [shortMessage, setShortMessage] = useState('')

  useEffect(() => {
    const storageKey = `wondr-reader-position:${topic.id}`
    const updatePosition = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      setReaderProgress(maxScroll > 0 ? Math.min(100, Math.round((window.scrollY / maxScroll) * 100)) : 0)
      window.localStorage.setItem(storageKey, String(window.scrollY))
    }
    const savedPosition = Number(window.localStorage.getItem(storageKey) ?? 0)
    const restorePosition = () => window.scrollTo({ top: Number.isFinite(savedPosition) ? savedPosition : 0, behavior: 'auto' })
    window.requestAnimationFrame(() => { restorePosition(); window.requestAnimationFrame(restorePosition) })
    const restoreTimer = window.setTimeout(restorePosition, 120)
    window.addEventListener('scroll', updatePosition, { passive: true })
    return () => {
      updatePosition()
      window.clearTimeout(restoreTimer)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [topic.id])

  useEffect(() => {
    function handleSelection() {
      const currentSelection = window.getSelection()
      const text = currentSelection?.toString().trim() ?? ''
      if (!text || !currentSelection?.rangeCount) {
        setSelection(null)
        return
      }
      const range = currentSelection.getRangeAt(0)
      const notesRoot = range.commonAncestorContainer.parentElement?.closest('.reader-notes-content')
      if (!notesRoot) {
        setSelection(null)
        return
      }
      const rect = range.getBoundingClientRect()
      const startOffset = textOffset(notesRoot, range.startContainer, range.startOffset)
      const endOffset = textOffset(notesRoot, range.endContainer, range.endOffset)
      setActiveHighlight(null)
      setSelection({ text, top: Math.min(window.innerHeight - 52, rect.bottom + 8), left: Math.min(window.innerWidth - 90, Math.max(90, rect.left + rect.width / 2)), startOffset, endOffset })
    }
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  function addSelection() {
    if (!selection) return
    onAddStudyItem(selection.text, topic.notes)
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }

  async function addSelectionToShorts() {
    if (!selection) return
    const selectedText = selection.text
    setSelection(null)
    window.getSelection()?.removeAllRanges()
    try {
      await createQuickNoteFromText(selectedText, 'Okumadan')
      setShortMessage("Shorts'a eklendi.")
    } catch {
      setShortMessage("Short oluşturulamadı.")
    }
    window.setTimeout(() => setShortMessage(''), 1800)
  }

  function markSelection() {
    if (!selection) return
    onAddHighlight({ topicId: topic.id, selectedText: selection.text, startOffset: selection.startOffset, endOffset: selection.endOffset, contextBefore: topic.notes.slice(Math.max(0, selection.startOffset - 36), selection.startOffset), contextAfter: topic.notes.slice(selection.endOffset, selection.endOffset + 36) })
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }

  const ranges = highlightRanges(topic.notes, highlights)
  const paragraphSource = topic.notes || 'Bu konu için henüz not eklenmemiş.'
  const noteContent = paragraphSource.split(/\n\s*\n/).map((paragraph, index, paragraphs) => {
    const paragraphStart = paragraphs.slice(0, index).reduce((total, previous) => total + previous.length + 2, 0)
    return <p className="reader-paragraph" key={`${paragraphStart}-${paragraph}`}>{renderMarkedText(paragraph, ranges, paragraphStart, (event, highlight) => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setSelection(null); setActiveHighlight({ id: highlight.id, top: Math.min(window.innerHeight - 52, rect.bottom + 8), left: Math.min(window.innerWidth - 70, Math.max(70, rect.left + rect.width / 2)) }) })}</p>
  })
  const relationships = [
    { label: '↑ üst', names: topicNames(topic.parentTopicIds, topics) },
    { label: '↓ alt', names: topicNames(topic.childTopicIds, topics) },
    { label: '↔ ilişkili', names: topicNames(topic.relatedTopicIds, topics) },
  ].filter((relationship) => relationship.names.length > 0)

  return <main className="topic-reader" aria-labelledby="reader-title">
    <div className="reader-topline"><button className="back-link" type="button" onClick={onBack}>← Konulara dön</button><div className="reader-actions"><button className="archive-button" type="button" onClick={() => onArchive(topic.id)}>{topic.archivedAt ? 'Arşivden çıkar' : 'Arşivle'}</button><button className="edit-button" type="button" onClick={() => onEdit(topic.id)}>Düzenle</button></div></div>
    <div className="reader-sticky-bar"><strong>{topic.title}</strong><span>{readerProgress}% okundu</span></div><div className="reader-progress" aria-hidden="true"><span style={{ width: `${readerProgress}%` }}/></div><header className="reader-heading"><p className="eyebrow">KONU</p><h1 id="reader-title">{topic.title}<span>.</span></h1><p className="reader-meta">{topic.noteCount} not <i/> son çalışma {topic.lastStudied} <i/> {studyHistory.length} çalışma</p></header>
    {relationships.length > 0 && <div className="reader-relations">{relationships.map((relationship) => <div className="reader-relation" key={relationship.label}><span>{relationship.label}</span><p>{relationship.names.map((name) => { const related = topics.find((candidate) => candidate.title === name); return related ? <button type="button" key={related.id} onClick={() => onOpenTopic(related.id)}>{name}</button> : null })}</p></div>)}</div>}
    <article className="reader-notes"><p className="eyebrow">NOTLAR</p><div className="reader-notes-content">{noteContent}</div></article>
    <details className="reader-workspace" open={notesOpen} onToggle={(event) => setNotesOpen(event.currentTarget.open)}><summary className="workspace-heading"><span className="eyebrow">NOTLARIM</span></summary>{notes.length === 0 && <p className="workspace-empty">Bu konu için henüz bir çalışma notun yok.</p>}{notes.map((note) => <article className="personal-note" key={note.id}><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString('tr-TR')}</time>{editingNoteId === note.id ? <textarea value={noteDraft ?? note.content} onChange={(event) => setNoteDraft(event.target.value)} /> : <p>{note.content}</p>}<div><button type="button" onClick={() => { if (editingNoteId === note.id) { if (noteDraft?.trim()) onUpdateNote(note.id, noteDraft.trim()); setEditingNoteId(null); setNoteDraft(null) } else { setEditingNoteId(note.id); setNoteDraft(note.content) } }}>{editingNoteId === note.id ? 'Kaydet' : 'Düzenle'}</button><button type="button" onClick={() => { if (window.confirm('Bu notu silmek istediğine emin misin?')) onDeleteNote(note.id) }}>Sil</button></div></article>)}</details>
    <details className="reader-study-items" open={studyItemsOpen} onToggle={(event) => setStudyItemsOpen(event.currentTarget.open)}><summary className="workspace-heading"><span className="eyebrow">ÇALIŞMA LİSTEM</span></summary>{studyItems.length === 0 ? <p className="workspace-empty">Bu konudan henüz bir çalışma ifadesi yok.</p> : studyItems.map((item) => <p key={item.id}>“{item.text}”</p>)}</details>
    <div className="reader-danger-actions"><button className="delete-topic-button" type="button" onClick={() => { if (window.confirm('Bu konuyu silmek istediğine emin misin?\nKonu ve ilişkili çalışma verileri silinecek.')) onDelete(topic.id) }}>Konuyu Sil</button></div>
    <button className="reader-note-fab" type="button" onClick={() => { setEditingNoteId(null); setNoteDraft(''); setNotePanelOpen(true) }}>+ Not Ekle</button>
    {notePanelOpen && <div className="reader-note-panel-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setNotePanelOpen(false) }}><section className="reader-note-panel" role="dialog" aria-modal="true" aria-labelledby="reader-note-title"><div className="note-panel-heading"><p className="eyebrow">ÇALIŞMA NOTU</p><button type="button" onClick={() => setNotePanelOpen(false)} aria-label="Not panelini kapat">×</button></div><h2 id="reader-note-title">Aklında ne kaldı?</h2><form onSubmit={(event) => { event.preventDefault(); if (noteDraft?.trim()) onCreateNote(noteDraft.trim(), topic.id); setNotePanelOpen(false); setNoteDraft(null) }}><textarea autoFocus required value={noteDraft ?? ''} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Bu okuma sırasında aklına gelenleri yaz..." rows={7}/><div><button className="edit-button" type="button" onClick={() => setNotePanelOpen(false)}>İptal</button><button className="study-button" type="submit">Kaydet</button></div></form></section></div>}
    {selection && <div className="selection-toolbar" style={{ top: selection.top, left: selection.left }} onMouseDown={(event) => event.preventDefault()}><button type="button" onClick={markSelection}>İşaretle</button><button type="button" onClick={addSelection}>Çalış</button><button type="button" onClick={addSelectionToShorts}>Short'a ekle</button></div>}
    {activeHighlight && <button className="selection-action remove-highlight-action" type="button" style={{ top: activeHighlight.top, left: activeHighlight.left }} onMouseDown={(event) => event.preventDefault()} onClick={() => { onRemoveHighlight(activeHighlight.id); setActiveHighlight(null) }}>İşareti kaldır</button>}
    {shortMessage && <div className="toast" role="status">{shortMessage}</div>}
  </main>
}
