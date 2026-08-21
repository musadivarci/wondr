import { useEffect, useState } from 'react'
import type { Highlight, StudyHistory, Topic } from '../types'

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

export function TopicReader({ topic, topics, onBack, onEdit, onAddStudyItem, onAddHighlight, onRemoveHighlight, studyHistory, highlights }: TopicReaderProps) {
  const [selection, setSelection] = useState<{ text: string; top: number; left: number; startOffset: number; endOffset: number } | null>(null)
  const [activeHighlight, setActiveHighlight] = useState<{ id: string; top: number; left: number } | null>(null)

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

  function markSelection() {
    if (!selection) return
    onAddHighlight({ topicId: topic.id, selectedText: selection.text, startOffset: selection.startOffset, endOffset: selection.endOffset, contextBefore: topic.notes.slice(Math.max(0, selection.startOffset - 36), selection.startOffset), contextAfter: topic.notes.slice(selection.endOffset, selection.endOffset + 36) })
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }

  const ranges = highlightRanges(topic.notes, highlights)
  const noteContent = ranges.length === 0 ? <>{topic.notes || 'Bu konu için henüz not eklenmemiş.'}</> : <>{ranges.reduce<React.ReactNode[]>((parts, range, index) => {
    const previousEnd = index === 0 ? 0 : ranges[index - 1].end
    if (range.start < previousEnd) return parts
    parts.push(topic.notes.slice(previousEnd, range.start), <mark className="note-highlight" key={range.highlight.id} onClick={(event) => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setSelection(null); setActiveHighlight({ id: range.highlight.id, top: Math.min(window.innerHeight - 52, rect.bottom + 8), left: Math.min(window.innerWidth - 70, Math.max(70, rect.left + rect.width / 2)) }) }}>{topic.notes.slice(range.start, range.end)}</mark>)
    return parts
  }, [])}{topic.notes.slice(ranges[ranges.length - 1].end)}</>
  const relationships = [
    { label: '↑ üst', names: topicNames(topic.parentTopicIds, topics) },
    { label: '↓ alt', names: topicNames(topic.childTopicIds, topics) },
    { label: '↔ ilişkili', names: topicNames(topic.relatedTopicIds, topics) },
  ].filter((relationship) => relationship.names.length > 0)

  return <main className="topic-reader" aria-labelledby="reader-title">
    <div className="reader-topline"><button className="back-link" type="button" onClick={onBack}>← Konulara dön</button><button className="edit-button" type="button" onClick={() => onEdit(topic.id)}>Düzenle</button></div>
    <header className="reader-heading"><p className="eyebrow">KONU</p><h1 id="reader-title">{topic.title}<span>.</span></h1><p className="reader-meta">{topic.noteCount} not <i/> son çalışma {topic.lastStudied} <i/> {studyHistory.length} çalışma</p></header>
    {relationships.length > 0 && <div className="reader-relations">{relationships.map((relationship) => <div className="reader-relation" key={relationship.label}><span>{relationship.label}</span><p>{relationship.names.join(' · ')}</p></div>)}</div>}
    <article className="reader-notes"><p className="eyebrow">NOTLAR</p><div className="reader-notes-content">{noteContent}</div></article>
    {selection && <div className="selection-toolbar" style={{ top: selection.top, left: selection.left }} onMouseDown={(event) => event.preventDefault()}><button type="button" onClick={markSelection}>İşaretle</button><button type="button" onClick={addSelection}>Çalış</button></div>}
    {activeHighlight && <button className="selection-action remove-highlight-action" type="button" style={{ top: activeHighlight.top, left: activeHighlight.left }} onMouseDown={(event) => event.preventDefault()} onClick={() => { onRemoveHighlight(activeHighlight.id); setActiveHighlight(null) }}>İşareti kaldır</button>}
  </main>
}
