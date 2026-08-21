import { useEffect, useRef, useState } from 'react'
import { TopicForm } from './components/TopicForm'
import { TopicGrid } from './components/TopicGrid'
import { TopicReader } from './components/TopicReader'
import { StudyList } from './components/StudyList'
import { LearningPath } from './components/LearningPath'
import { KnowledgeMap } from './components/KnowledgeMap'
import { AuthScreen } from './components/AuthScreen'
import { NotesPage } from './components/NotesPage'
import { highlightsStorageKey, initialTopics, notesStorageKey, studyHistoryStorageKey, studyItemsStorageKey, topicOrderStorageKey, topicsStorageKey } from './data'
import type { Highlight, Note, StudyHistory, StudyItem, Topic, TopicFormValues } from './types'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { deleteCloudTopic, loadCloudTopics, migrateTopics, saveCloudOrder, saveCloudTopic } from './services/topics'
import { deleteCloudNote, loadCloudNotes, migrateNotes, saveCloudNote } from './services/notes'
import { deleteCloudHighlight, loadCloudStudy, migrateStudy, saveCloudHighlight, saveCloudHistory, saveCloudStudyItem } from './services/study'
import type { Session } from '@supabase/supabase-js'
import './App.css'

type SortMode = 'manual' | 'last-studied' | 'newest' | 'alphabetical'

function loadTopics() {
  try {
    const storedValue = window.localStorage.getItem(topicsStorageKey)
    if (storedValue === null) return isSupabaseConfigured ? [] : initialTopics
    const storedTopics = JSON.parse(storedValue)
    return Array.isArray(storedTopics) ? storedTopics as Topic[] : []
  } catch {
    return isSupabaseConfigured ? [] : initialTopics
  }
}

function formatRelativeDate(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  if (days <= 0) return 'Bugün'
  if (days === 1) return 'Dün'
  return `${days} gün önce`
}

function BottomNavigation({ activeScreen, onTopics, onLearningPath, onStudyItems, onNotes, onKnowledgeMap }: { activeScreen: string; onTopics: () => void; onLearningPath: () => void; onStudyItems: () => void; onNotes: () => void; onKnowledgeMap: () => void }) {
  return <nav className="bottom-navigation" aria-label="Ana bölümler">
    <button className={activeScreen === 'list' ? 'active' : ''} type="button" onClick={onTopics}><span>01</span>Konular</button><button className={activeScreen === 'learning-path' ? 'active' : ''} type="button" onClick={onLearningPath}><span>02</span>Learning Path</button><button className={activeScreen === 'study-list' ? 'active' : ''} type="button" onClick={onStudyItems}><span>03</span>Öğrenecekler</button><button className={activeScreen === 'notes' ? 'active' : ''} type="button" onClick={onNotes}><span>04</span>Notlar</button><button className={activeScreen === 'knowledge-map' ? 'active' : ''} type="button" onClick={onKnowledgeMap}><span>05</span>Knowledge Map</button>
  </nav>
}

function App() {
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [localMode, setLocalMode] = useState(false)
  const [cloudReady, setCloudReady] = useState(!isSupabaseConfigured)
  const [cloudWriteEnabled, setCloudWriteEnabled] = useState(!isSupabaseConfigured)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [topics, setTopics] = useState<Topic[]>(loadTopics)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null)
  const [screen, setScreen] = useState<'list' | 'form' | 'reader' | 'study-list' | 'notes' | 'learning-path' | 'knowledge-map'>('list')
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null)
  const [studyItems, setStudyItems] = useState<StudyItem[]>(() => {
    try {
      const storedItems = JSON.parse(window.localStorage.getItem(studyItemsStorageKey) ?? '[]')
      return Array.isArray(storedItems) ? storedItems as StudyItem[] : []
    } catch {
      return []
    }
  })
  const [studyHistory, setStudyHistory] = useState<StudyHistory[]>(() => {
    try {
      const storedHistory = JSON.parse(window.localStorage.getItem(studyHistoryStorageKey) ?? '[]')
      return Array.isArray(storedHistory) ? storedHistory as StudyHistory[] : []
    } catch {
      return []
    }
  })
  const [highlights, setHighlights] = useState<Highlight[]>(() => {
    try {
      const storedHighlights = JSON.parse(window.localStorage.getItem(highlightsStorageKey) ?? '[]')
      return Array.isArray(storedHighlights) ? storedHighlights as Highlight[] : []
    } catch {
      return []
    }
  })
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const storedNotes = JSON.parse(window.localStorage.getItem(notesStorageKey) ?? '[]')
      return Array.isArray(storedNotes) ? storedNotes as Note[] : []
    } catch {
      return []
    }
  })
  const [conversionSource, setConversionSource] = useState<StudyItem | null>(null)
  const [toast, setToast] = useState('')
  const [manualOrder, setManualOrder] = useState<string[]>(() => {
    const storedTopics = loadTopics()
    try {
      const storedOrder = JSON.parse(window.localStorage.getItem(topicOrderStorageKey) ?? 'null')
      if (Array.isArray(storedOrder)) {
        const knownIds = new Set(storedTopics.map((topic) => topic.id))
        const savedIds = storedOrder.filter((id): id is string => typeof id === 'string' && knownIds.has(id))
        return [...new Set([...savedIds, ...storedTopics.map((topic) => topic.id)])]
      }
    } catch {
      return storedTopics.map((topic) => topic.id)
    }
    return storedTopics.map((topic) => topic.id)
  })
  const localSnapshot = useRef({ topics, topicOrder: manualOrder, studyItems, studyHistory, highlights, notes })

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setCloudReady(!data.session)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setCloudReady(!nextSession)
      setAuthReady(true)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || localMode || !session) return
    let cancelled = false
    Promise.all([loadCloudTopics(session.user.id), loadCloudStudy(session.user.id), loadCloudNotes(session.user.id)]).then(([cloudTopics, cloudStudy, cloudNotes]) => {
      if (cancelled) return
      if (cloudTopics.length) {
        setTopics(cloudTopics)
        setManualOrder(cloudTopics.map((topic) => topic.id))
        setStudyItems(cloudStudy.items)
        setStudyHistory(cloudStudy.history)
        setHighlights(cloudStudy.highlights)
          setNotes(cloudNotes)
          setCloudWriteEnabled(true)
        } else if (localSnapshot.current.topics.length || localSnapshot.current.studyItems.length || localSnapshot.current.studyHistory.length || localSnapshot.current.highlights.length || localSnapshot.current.notes.length) {
        setMigrationNeeded(true)
          setCloudWriteEnabled(false)
        } else {
          setCloudWriteEnabled(true)
      }
      setCloudReady(true)
    }).catch(() => {
      if (!cancelled) {
        setCloudReady(true)
        setCloudError('Çevrimiçi veriler yüklenemedi. Bağlantını kontrol et.')
      }
    })
    return () => { cancelled = true }
  }, [localMode, session])

  useEffect(() => {
    window.localStorage.setItem(topicsStorageKey, JSON.stringify(topics))
    if (!isSupabaseConfigured || localMode || !session || !cloudReady || !cloudWriteEnabled) return
    Promise.all(topics.map((topic) => saveCloudTopic(session.user.id, topic))).catch(() => setCloudError('Değişiklik çevrimiçi kaydedilemedi.'))
  }, [cloudReady, cloudWriteEnabled, localMode, session, topics])

  useEffect(() => {
    window.localStorage.setItem(topicOrderStorageKey, JSON.stringify(manualOrder))
    if (!isSupabaseConfigured || localMode || !session || !cloudReady || !cloudWriteEnabled) return
    saveCloudOrder(session.user.id, manualOrder).catch(() => setCloudError('Konu sırası çevrimiçi kaydedilemedi.'))
  }, [cloudReady, cloudWriteEnabled, localMode, manualOrder, session])

  useEffect(() => {
    window.localStorage.setItem(studyItemsStorageKey, JSON.stringify(studyItems))
    if (!isSupabaseConfigured || localMode || !session || !cloudReady || !cloudWriteEnabled) return
    Promise.all(studyItems.map((item) => saveCloudStudyItem(session.user.id, item))).catch(() => setCloudError('Öğrenecekler listesi çevrimiçi kaydedilemedi.'))
  }, [cloudReady, cloudWriteEnabled, localMode, session, studyItems])

  useEffect(() => {
    window.localStorage.setItem(studyHistoryStorageKey, JSON.stringify(studyHistory))
    if (!isSupabaseConfigured || localMode || !session || !cloudReady || !cloudWriteEnabled) return
    Promise.all(studyHistory.map((study) => saveCloudHistory(session.user.id, study))).catch(() => setCloudError('Çalışma geçmişi çevrimiçi kaydedilemedi.'))
  }, [cloudReady, cloudWriteEnabled, localMode, session, studyHistory])

  useEffect(() => {
    window.localStorage.setItem(highlightsStorageKey, JSON.stringify(highlights))
    if (!isSupabaseConfigured || localMode || !session || !cloudReady || !cloudWriteEnabled) return
    Promise.all(highlights.map((highlight) => saveCloudHighlight(session.user.id, highlight))).catch(() => setCloudError('İşaretler çevrimiçi kaydedilemedi.'))
  }, [cloudReady, cloudWriteEnabled, highlights, localMode, session])

  useEffect(() => {
    window.localStorage.setItem(notesStorageKey, JSON.stringify(notes))
    if (!isSupabaseConfigured || localMode || !session || !cloudReady || !cloudWriteEnabled) return
    Promise.all(notes.map((note) => saveCloudNote(session.user.id, note))).catch(() => setCloudError('Notlar çevrimiçi kaydedilemedi.'))
  }, [cloudReady, cloudWriteEnabled, localMode, notes, session])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  async function transferLocalData() {
    if (!session) return
    try {
        await migrateTopics(session.user.id, { topics, topicOrder: manualOrder, studyItems, studyHistory, highlights, notes }, migrateStudy)
        if (notes.length && supabase) await migrateNotes(supabase, session.user.id, { topics, topicOrder: manualOrder, studyItems, studyHistory, highlights, notes })
        setCloudWriteEnabled(true)
      setMigrationNeeded(false)
      setToast('Yerel verilerin çevrimiçi hesaba aktarıldı.')
    } catch {
      setCloudError('Yerel veriler aktarılırken bir hata oluştu. LocalStorage korunuyor.')
    }
  }

  function continueWithoutTransfer() {
    setMigrationNeeded(false)
    setLocalMode(true)
    setToast('Yerel sürüm açık. Verilerin cihazında kalır.')
  }

  async function logOut() {
    if (supabase) await supabase.auth.signOut()
    setLocalMode(false)
  }

  if (isSupabaseConfigured && !localMode && (!authReady || !session)) return authReady ? <AuthScreen onLocalMode={() => setLocalMode(true)}/> : <main className="loading-page">wondR yükleniyor...</main>
  if (isSupabaseConfigured && !localMode && session && !cloudReady) return <main className="loading-page">wondR verilerin yükleniyor...</main>

  const orderedTopics = manualOrder.map((id) => topics.find((topic) => topic.id === id)).filter((topic): topic is Topic => Boolean(topic))
  const sortedTopics = sortMode === 'manual'
    ? orderedTopics
    : [...topics].sort((firstTopic, secondTopic) => {
      if (sortMode === 'alphabetical') return firstTopic.title.localeCompare(secondTopic.title, 'tr-TR')
      if (sortMode === 'newest') return secondTopic.createdAt.localeCompare(firstTopic.createdAt)
      return secondTopic.updatedAt.localeCompare(firstTopic.updatedAt)
    })
  const visibleTopics = sortedTopics.filter((topic) => Boolean(topic.archivedAt) === showArchived && topic.title.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')))

  function handleDrop(targetTopicId: string) {
    if (sortMode !== 'manual' || !draggedTopicId || draggedTopicId === targetTopicId) return
    const nextOrder = [...manualOrder]
    const draggedIndex = nextOrder.indexOf(draggedTopicId)
    const targetIndex = nextOrder.indexOf(targetTopicId)
    if (draggedIndex < 0 || targetIndex < 0) return
    nextOrder.splice(draggedIndex, 1)
    nextOrder.splice(nextOrder.indexOf(targetTopicId), 0, draggedTopicId)
    setManualOrder(nextOrder)
    setDraggedTopicId(null)
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>, targetTopicId: string) {
    if (sortMode === 'manual' && draggedTopicId && draggedTopicId !== targetTopicId) event.preventDefault()
  }

  function openNewTopic() {
    setActiveTopicId(null)
    setConversionSource(null)
    setScreen('form')
  }

  function openEditTopic(topicId: string) {
    setActiveTopicId(topicId)
    setScreen('form')
  }

  function openReader(topicId: string) {
    setActiveTopicId(topicId)
    setScreen('reader')
  }

  function openStudyItems() {
    setScreen('study-list')
  }

  function openNotes() {
    setScreen('notes')
  }

  function openLearningPath() {
    setScreen('learning-path')
  }

  function openKnowledgeMap() {
    setScreen('knowledge-map')
  }

  function startStudy(topicId: string) {
    const startedAt = new Date().toISOString()
    setStudyHistory((currentHistory) => [...currentHistory, { id: `history-${Date.now()}`, topicId, startedAt }])
    setTopics((currentTopics) => currentTopics.map((topic) => topic.id === topicId ? { ...topic, lastStudied: formatRelativeDate(startedAt), lastStudiedAt: startedAt, updatedAt: startedAt } : topic))
    openReader(topicId)
  }

  function exportBackup() {
    const backup = { topics, topicOrder: manualOrder, studyItems, studyHistory, highlights, notes }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wondr-yedek-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setToast('wondR verilerin dışa aktarıldı.')
  }

  function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result))
        const validTopics = Array.isArray(backup.topics) && backup.topics.every((topic: Topic) => topic && typeof topic.id === 'string' && typeof topic.title === 'string' && Array.isArray(topic.parentTopicIds) && Array.isArray(topic.childTopicIds) && Array.isArray(topic.relatedTopicIds))
        if (!validTopics || !Array.isArray(backup.topicOrder) || !Array.isArray(backup.studyItems) || !Array.isArray(backup.studyHistory) || (backup.highlights !== undefined && !Array.isArray(backup.highlights))) throw new Error('Geçersiz yedek')
        setTopics(backup.topics as Topic[])
        setManualOrder(backup.topicOrder.filter((id: unknown): id is string => typeof id === 'string'))
        setStudyItems(backup.studyItems as StudyItem[])
        setStudyHistory(backup.studyHistory as StudyHistory[])
        setHighlights((backup.highlights ?? []) as Highlight[])
          setNotes((backup.notes ?? []) as Note[])
        setToast('wondR verilerin geri yüklendi.')
      } catch {
        setToast('Bu dosya geçerli bir wondR yedeği değil.')
      }
    }
    reader.readAsText(file)
  }

  function addStudyItem(text: string, sourceExcerpt: string, topicId: string) {
    const normalizedText = text.trim()
    const alreadyExists = studyItems.some((item) => item.topicId === topicId && item.text.trim() === normalizedText)
    if (alreadyExists) {
      setToast('Bu ifade zaten listende.')
      return
    }
    setStudyItems((currentItems) => [...currentItems, { id: `study-${Date.now()}`, text: normalizedText, topicId, sourceExcerpt, createdAt: new Date().toISOString(), status: 'todo' }])
    setToast('Çalışmam gerekli listesine eklendi.')
  }

  function addHighlight(values: Omit<Highlight, 'id' | 'createdAt'>) {
    const duplicate = highlights.some((highlight) => highlight.topicId === values.topicId && highlight.selectedText === values.selectedText && highlight.startOffset === values.startOffset)
    if (duplicate) {
      setToast('Bu bölüm zaten işaretli.')
      return
    }
    setHighlights((currentHighlights) => [...currentHighlights, { ...values, id: `highlight-${Date.now()}`, createdAt: new Date().toISOString() }])
    setToast('Bölüm işaretlendi.')
  }

  function removeHighlight(highlightId: string) {
    setHighlights((currentHighlights) => currentHighlights.filter((highlight) => highlight.id !== highlightId))
    if (isSupabaseConfigured && !localMode && session) deleteCloudHighlight(session.user.id, highlightId).catch(() => setCloudError('İşaret çevrimiçi silinemedi.'))
    setToast('İşaret kaldırıldı.')
  }

  function createNote(content: string, topicId: string) {
    const now = new Date().toISOString()
    setNotes((currentNotes) => [{ id: `note-${Date.now()}`, topicId, content, createdAt: now, updatedAt: now }, ...currentNotes])
    setToast('Çalışma notun kaydedildi.')
  }

  function updateNote(noteId: string, content: string) {
    setNotes((currentNotes) => currentNotes.map((note) => note.id === noteId ? { ...note, content, updatedAt: new Date().toISOString() } : note))
    setToast('Çalışma notun güncellendi.')
  }

  function removeNote(noteId: string) {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId))
    if (isSupabaseConfigured && !localMode && session) deleteCloudNote(session.user.id, noteId).catch(() => setCloudError('Not çevrimiçi silinemedi.'))
    setToast('Çalışma notu silindi.')
  }

  function toggleArchive(topicId: string) {
    setTopics((currentTopics) => currentTopics.map((topic) => topic.id === topicId ? { ...topic, archivedAt: topic.archivedAt ? undefined : new Date().toISOString() } : topic))
    setToast('Konu arşiv durumu güncellendi.')
  }

  function removeTopic(topicId: string) {
    setTopics((currentTopics) => currentTopics.filter((topic) => topic.id !== topicId))
    setManualOrder((currentOrder) => currentOrder.filter((id) => id !== topicId))
    setNotes((currentNotes) => currentNotes.filter((note) => note.topicId !== topicId))
    setHighlights((currentHighlights) => currentHighlights.filter((highlight) => highlight.topicId !== topicId))
    setStudyHistory((currentHistory) => currentHistory.filter((study) => study.topicId !== topicId))
    setStudyItems((currentItems) => currentItems.filter((item) => item.topicId !== topicId))
    if (isSupabaseConfigured && !localMode && session) deleteCloudTopic(session.user.id, topicId).catch(() => setCloudError('Konu çevrimiçi silinemedi.'))
    setActiveTopicId(null)
    setScreen('list')
    setToast('Konu silindi.')
  }

  function convertStudyItem(item: StudyItem) {
    setConversionSource(item)
    setActiveTopicId(null)
    setScreen('form')
  }

  function completeStudyItem(itemId: string) {
    setStudyItems((currentItems) => currentItems.map((item) => item.id === itemId ? { ...item, status: 'done' } : item))
  }

  function saveTopic(values: TopicFormValues) {
    const now = new Date().toISOString()
    const existingTopic = topics.find((topic) => topic.id === activeTopicId)
    const parentTopicIds = values.parentTopicId ? [values.parentTopicId] : []
    const childTopicIds = values.childTopicId ? [values.childTopicId] : []
    const relatedTopicIds = values.relatedTopicId ? [values.relatedTopicId] : []
    if (!existingTopic && conversionSource && !relatedTopicIds.includes(conversionSource.topicId)) relatedTopicIds.push(conversionSource.topicId)
    const savedTopic: Topic = {
      id: existingTopic?.id ?? `topic-${Date.now()}`,
      title: values.title.trim(),
      notes: values.notes.trim(),
      noteCount: existingTopic?.noteCount ?? (values.notes.trim() ? 1 : 0),
      parentTopicIds,
      childTopicIds,
      relatedTopicIds,
      lastStudied: existingTopic?.lastStudied ?? 'Henüz çalışılmadı',
      lastStudiedAt: existingTopic?.lastStudiedAt,
      archivedAt: existingTopic?.archivedAt,
      createdAt: existingTopic?.createdAt ?? now,
      updatedAt: now,
    }
    setTopics((currentTopics) => existingTopic ? currentTopics.map((topic) => topic.id === existingTopic.id ? savedTopic : topic) : [...currentTopics, savedTopic])
    if (!existingTopic) setManualOrder((currentOrder) => [...currentOrder, savedTopic.id])
    setActiveTopicId(savedTopic.id)
    setConversionSource(null)
    setScreen('list')
  }

  const activeTopic = topics.find((topic) => topic.id === activeTopicId)

  function renderList() {
    const latestStudy = [...studyHistory].sort((first, second) => second.startedAt.localeCompare(first.startedAt))[0]
    const latestTopic = latestStudy ? topics.find((topic) => topic.id === latestStudy.topicId) : undefined
    const neglectedTopic = topics.filter((topic) => !studyHistory.some((study) => study.topicId === topic.id)).sort((first, second) => first.updatedAt.localeCompare(second.updatedAt))[0]
    return <main className="topics" id="topics">
      <div className="page-heading"><p className="eyebrow">MERAK ALANIN</p><h1>{showArchived ? 'Arşiv' : 'Konularım'}<span>.</span></h1><p className="topic-count">{String(visibleTopics.length).padStart(2, '0')} / {String(topics.filter((topic) => Boolean(topic.archivedAt) === showArchived).length).padStart(2, '0')} KONU</p></div>
      {topics.length === 0 && !showArchived ? <section className="empty-home" aria-label="Boş konu durumu"><p className="manifesto">I WONDER HOW THIS WORKS.</p><h2>Henüz bir öğrenme konusu yok.</h2><button className="study-button" type="button" onClick={openNewTopic}>+ İlk konunu oluştur</button></section> : <><section className="learning-summary" aria-label="Kişisel öğrenme özeti"><div><p>DEVAM ET</p><strong>{latestTopic?.title ?? 'İlk konunu seç'}</strong><span>{latestStudy ? `Son çalışma: ${formatRelativeDate(latestStudy.startedAt)}` : 'Çalışmaya başla'}</span></div><button type="button" onClick={openStudyItems}><p>ÖĞRENECEKLER</p><strong>{studyItems.filter((item) => item.status === 'todo').length}</strong><span>bekleyen ifade</span></button><div><p>GERİ DÖN</p><strong>{neglectedTopic?.title ?? 'Tüm konular güncel'}</strong><span>{neglectedTopic ? `${formatRelativeDate(neglectedTopic.updatedAt)} çalışılmadı` : 'Güzel gidiyorsun'}</span></div></section><div className="topic-toolbar"><label className="search-field"><span className="visually-hidden">Konularda ara</span><input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Konularda ara" /></label><div className="toolbar-actions"><label className="sort-control"><span>Sırala</span><select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="manual">Manuel</option><option value="last-studied">Son çalışılan</option><option value="newest">Yeni eklenen</option><option value="alphabetical">A-Z</option></select></label><button className="archive-toggle" type="button" onClick={() => setShowArchived((current) => !current)}>{showArchived ? 'Konular' : 'Arşiv'}</button><button className="new-topic" type="button" onClick={openNewTopic}><span>+</span> Yeni Konu</button></div></div>{visibleTopics.length === 0 ? <p className="empty-topics">{showArchived ? 'Arşivin boş.' : 'Bu aramaya uyan konu bulunamadı.'}</p> : <TopicGrid topics={visibleTopics} isDraggable={!showArchived && sortMode === 'manual'} onDragStart={setDraggedTopicId} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={() => setDraggedTopicId(null)} onStudy={startStudy} onEdit={openEditTopic} onArchive={toggleArchive} isArchived={showArchived}/>}</>}
    </main>
  }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#topics" aria-label="wondR ana sayfa">wond<span>R</span></a><p className="manifesto">I WONDER HOW THIS WORKS.</p><div className="backup-actions"><button type="button" onClick={exportBackup}>Dışa aktar</button><label>İçe aktar<input type="file" accept="application/json,.json" onChange={importBackup}/></label>{session && !localMode && <button type="button" onClick={logOut}>Çıkış</button>}</div></header>
    {cloudError && <div className="cloud-error" role="alert">{cloudError}<button type="button" onClick={() => setCloudError('')} aria-label="Mesajı kapat">×</button></div>}
    {migrationNeeded && <div className="migration-backdrop"><section className="migration-dialog" role="dialog" aria-modal="true" aria-labelledby="migration-title"><p className="eyebrow">ÇEVRİMİÇİ HESAP</p><h2 id="migration-title">Yerel verilerini aktar</h2><p>Cihazındaki konular, Öğrenecekler listen ve çalışma geçmişin bu hesaba aktarılabilir. Aktarım başarılı olmadan yerel verilerin silinmez.</p><div><button className="edit-button" type="button" onClick={continueWithoutTransfer}>Şimdilik yerelde kal</button><button className="study-button" type="button" onClick={transferLocalData}>Hesaba aktar</button></div></section></div>}
    {screen === 'list' && renderList()}
    {screen === 'learning-path' && <LearningPath topics={topics.filter((topic) => !topic.archivedAt)} onOpenTopic={openReader}/>} 
    {screen === 'knowledge-map' && <KnowledgeMap topics={topics.filter((topic) => !topic.archivedAt)} studyHistory={studyHistory} onStudy={startStudy} onEdit={openEditTopic} onOpenTopic={openReader} onCreateTopic={openNewTopic}/>} 
    {screen === 'form' && <TopicForm key={`${activeTopicId ?? 'new'}-${conversionSource?.id ?? ''}`} topic={activeTopic} topics={topics} initialTitle={conversionSource?.text} sourceTopicTitle={conversionSource ? topics.find((topic) => topic.id === conversionSource.topicId)?.title : undefined} onCancel={() => setScreen(activeTopic ? 'reader' : 'list')} onSave={saveTopic}/>} 
    {screen === 'reader' && activeTopic && <TopicReader topic={activeTopic} topics={topics} studyHistory={studyHistory.filter((study) => study.topicId === activeTopic.id)} highlights={highlights.filter((highlight) => highlight.topicId === activeTopic.id)} notes={notes.filter((note) => note.topicId === activeTopic.id)} studyItems={studyItems.filter((item) => item.topicId === activeTopic.id)} onBack={() => setScreen('list')} onEdit={openEditTopic} onOpenTopic={openReader} onArchive={toggleArchive} onDelete={removeTopic} onAddStudyItem={(text, sourceExcerpt) => addStudyItem(text, sourceExcerpt, activeTopic.id)} onAddHighlight={addHighlight} onRemoveHighlight={removeHighlight} onCreateNote={createNote} onUpdateNote={updateNote} onDeleteNote={removeNote}/>} 
    {screen === 'study-list' && <StudyList items={studyItems} topics={topics} onBack={() => setScreen('list')} onConvert={convertStudyItem} onComplete={completeStudyItem}/>} 
    {screen === 'notes' && <NotesPage notes={notes} topics={topics} onBack={() => setScreen('list')} onOpenTopic={openReader} onEditNote={updateNote} onDeleteNote={removeNote}/>} 
    {toast && <div className="toast" role="status">{toast}</div>}
    <BottomNavigation activeScreen={screen} onTopics={() => { setShowArchived(false); setScreen('list') }} onLearningPath={openLearningPath} onStudyItems={openStudyItems} onNotes={openNotes} onKnowledgeMap={openKnowledgeMap}/>
  </div>
}
export default App
