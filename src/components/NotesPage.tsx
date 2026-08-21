import { useState } from 'react'
import type { Note, Topic } from '../types'

type NotesPageProps = {
  notes: Note[]
  topics: Topic[]
  onBack: () => void
  onOpenTopic: (topicId: string) => void
  onEditNote: (noteId: string, content: string) => void
  onDeleteNote: (noteId: string) => void
}

export function NotesPage({ notes, topics, onBack, onOpenTopic, onEditNote, onDeleteNote }: NotesPageProps) {
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState('all')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const filteredNotes = notes.filter((note) => (topicFilter === 'all' || note.topicId === topicFilter) && note.content.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')))
  const groups = topics.map((topic) => ({ topic, notes: filteredNotes.filter((note) => note.topicId === topic.id) })).filter((group) => group.notes.length > 0)

  return <main className="notes-page" aria-labelledby="notes-page-title"><button className="back-link" type="button" onClick={onBack}>← Konulara dön</button><header className="notes-page-heading"><p className="eyebrow">BİRİKTİRDİKLERİN</p><h1 id="notes-page-title">Notlar<span>.</span></h1><p>{filteredNotes.length} çalışma notu</p></header><div className="notes-filters"><label className="search-field"><span className="visually-hidden">Notlarda ara</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Notlarda ara" /></label><select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}><option value="all">Tüm konular</option>{topics.filter((topic) => notes.some((note) => note.topicId === topic.id)).map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></div><section className="notes-groups">{groups.length === 0 && <p className="empty-topics">Henüz bir çalışma notun yok.</p>}{groups.map(({ topic, notes: topicNotes }) => <section className="notes-group" key={topic.id}><button className="notes-group-heading" type="button" onClick={() => onOpenTopic(topic.id)}><span>{topic.title}</span><small>{topicNotes.length} not</small></button>{topicNotes.sort((first, second) => second.createdAt.localeCompare(first.createdAt)).map((note) => <article className="notes-list-item" key={note.id}><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString('tr-TR')}</time>{editingNoteId === note.id ? <textarea value={draft} onChange={(event) => setDraft(event.target.value)} /> : <button type="button" onClick={() => onOpenTopic(note.topicId)}>{note.content}</button>}<div>{editingNoteId === note.id ? <button type="button" onClick={() => { if (draft.trim()) onEditNote(note.id, draft.trim()); setEditingNoteId(null) }}>Kaydet</button> : <button type="button" onClick={() => { setEditingNoteId(note.id); setDraft(note.content) }}>Düzenle</button>}<button type="button" onClick={() => { if (window.confirm('Bu notu silmek istediğine emin misin?')) onDeleteNote(note.id) }}>Sil</button></div></article>)}</section>)}</section></main>
}
