import { useEffect, useMemo, useState } from 'react'
import type { Note, QuickNote, Topic } from '../types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { deleteQuickNote, loadQuickNotes, saveQuickNote } from '../services/quickNotes'
import './QuickNotes.css'

const storageKey = 'wondr-quick-notes'

type NotesPageProps = {
  notes: Note[]
  topics: Topic[]
  onBack: () => void
  onOpenTopic: (topicId: string) => void
  onEditNote: (noteId: string, content: string) => void
  onDeleteNote: (noteId: string) => void
}

function loadLocalNotes() {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(value) ? value as QuickNote[] : []
  } catch {
    return []
  }
}

export function NotesPage({ onBack }: NotesPageProps) {
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>(loadLocalNotes)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categoryDraft, setCategoryDraft] = useState('Genel')
  const [contentDraft, setContentDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [editingCategory, setEditingCategory] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(quickNotes))
  }, [quickNotes])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }
    let cancelled = false
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      if (!data.session) {
        setLoading(false)
        return
      }
      try {
        const cloudNotes = await loadQuickNotes(data.session.user.id)
        if (!cancelled) setQuickNotes(cloudNotes)
      } catch {
        if (!cancelled) setMessage('Notlar çevrimiçi yüklenemedi; cihazdaki kopya gösteriliyor.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(() => [...new Set(quickNotes.map((note) => note.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr-TR')), [quickNotes])
  const filteredNotes = useMemo(() => quickNotes
    .filter((note) => categoryFilter === 'all' || note.category === categoryFilter)
    .filter((note) => `${note.category} ${note.content}`.toLocaleLowerCase('tr-TR').includes(query.trim().toLocaleLowerCase('tr-TR')))
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)), [categoryFilter, query, quickNotes])

  const groups = useMemo(() => {
    const groupNames = categoryFilter === 'all' ? [...new Set(filteredNotes.map((note) => note.category))] : [categoryFilter]
    return groupNames.map((category) => ({ category, notes: filteredNotes.filter((note) => note.category === category) })).filter((group) => group.notes.length > 0)
  }, [categoryFilter, filteredNotes])

  async function currentUserId() {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.user.id ?? null
  }

  async function createNote(event: React.FormEvent) {
    event.preventDefault()
    const content = contentDraft.trim()
    const category = categoryDraft.trim() || 'Genel'
    if (!content) return
    const now = new Date().toISOString()
    const note: QuickNote = { id: `quick-${Date.now()}`, category, content, createdAt: now, updatedAt: now }
    setQuickNotes((current) => [note, ...current])
    setContentDraft('')
    setCategoryDraft(category)
    try {
      const userId = await currentUserId()
      if (userId) await saveQuickNote(userId, note)
      setMessage('Not kaydedildi.')
    } catch {
      setMessage('Not cihazda kaydedildi; çevrimiçi senkron daha sonra tekrar denenebilir.')
    }
  }

  async function commitEdit(note: QuickNote) {
    const content = editingContent.trim()
    const category = editingCategory.trim() || 'Genel'
    if (!content) return
    const updated = { ...note, content, category, updatedAt: new Date().toISOString() }
    setQuickNotes((current) => current.map((item) => item.id === note.id ? updated : item))
    setEditingId(null)
    try {
      const userId = await currentUserId()
      if (userId) await saveQuickNote(userId, updated)
      setMessage('Not güncellendi.')
    } catch {
      setMessage('Değişiklik cihazda kaldı; çevrimiçi güncellenemedi.')
    }
  }

  async function removeNote(noteId: string) {
    if (!window.confirm('Bu notu silmek istediğine emin misin?')) return
    setQuickNotes((current) => current.filter((note) => note.id !== noteId))
    try {
      const userId = await currentUserId()
      if (userId) await deleteQuickNote(userId, noteId)
      setMessage('Not silindi.')
    } catch {
      setMessage('Not cihazdan silindi; çevrimiçi silme tamamlanamadı.')
    }
  }

  return <main className="quick-notes-page" aria-labelledby="quick-notes-title">
    <button className="back-link" type="button" onClick={onBack}>← Konulara dön</button>
    <header className="quick-notes-heading">
      <div><p className="eyebrow">KISA NOT DEFTERİN</p><h1 id="quick-notes-title">Notlar<span>.</span></h1></div>
      <p>{quickNotes.length} not · {categories.length} kategori</p>
    </header>

    <form className="quick-note-composer" onSubmit={createNote}>
      <label><span>KATEGORİ</span><input list="quick-note-categories" value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} placeholder="Örn. Fikirler" /></label>
      <datalist id="quick-note-categories">{categories.map((category) => <option value={category} key={category}/>)}</datalist>
      <label className="quick-note-content"><span>NOT</span><textarea value={contentDraft} onChange={(event) => setContentDraft(event.target.value)} placeholder="Aklındaki kısa notu yaz..." rows={3}/></label>
      <button className="study-button" type="submit" disabled={!contentDraft.trim()}>+ Not Ekle</button>
    </form>

    <div className="quick-notes-toolbar">
      <label className="search-field"><span className="visually-hidden">Notlarda ara</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Notlarda ara" /></label>
      <div className="quick-note-categories" aria-label="Not kategorileri">
        <button className={categoryFilter === 'all' ? 'active' : ''} type="button" onClick={() => setCategoryFilter('all')}>Tümü</button>
        {categories.map((category) => <button className={categoryFilter === category ? 'active' : ''} type="button" key={category} onClick={() => setCategoryFilter(category)}>{category}</button>)}
      </div>
    </div>

    {message && <div className="quick-note-message" role="status">{message}<button type="button" onClick={() => setMessage('')} aria-label="Mesajı kapat">×</button></div>}
    {loading ? <p className="empty-topics">Notların yükleniyor...</p> : groups.length === 0 ? <section className="quick-notes-empty"><p>Henüz burada bir not yok.</p><span>Konu çalışmasından bağımsız, aklına gelen kısa bilgileri ve fikirleri kategorilere ayırabilirsin.</span></section> : <section className="quick-note-groups">{groups.map((group) => <section className="quick-note-group" key={group.category}><header><h2>{group.category}</h2><span>{group.notes.length}</span></header><div className="quick-note-grid">{group.notes.map((note) => <article className="quick-note-card" key={note.id}>{editingId === note.id ? <><input className="quick-note-edit-category" value={editingCategory} onChange={(event) => setEditingCategory(event.target.value)}/><textarea value={editingContent} onChange={(event) => setEditingContent(event.target.value)} rows={4}/><div className="quick-note-actions"><button type="button" onClick={() => setEditingId(null)}>İptal</button><button type="button" onClick={() => commitEdit(note)}>Kaydet</button></div></> : <><p>{note.content}</p><footer><time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString('tr-TR')}</time><div className="quick-note-actions"><button type="button" onClick={() => { setEditingId(note.id); setEditingContent(note.content); setEditingCategory(note.category) }}>Düzenle</button><button type="button" onClick={() => removeNote(note.id)}>Sil</button></div></footer></>}</article>)}</div></section>)}</section>}
  </main>
}
