import type { DragEvent } from 'react'
import { TopicGrid } from './TopicGrid'
import type { StudyHistory, StudyItem, Topic } from '../types'

export type SortMode = 'manual' | 'last-studied' | 'newest' | 'alphabetical'

type TopicsPageProps = {
  topics: Topic[]
  visibleTopics: Topic[]
  studyHistory: StudyHistory[]
  studyItems: StudyItem[]
  showArchived: boolean
  searchTerm: string
  sortMode: SortMode
  onSearchChange: (value: string) => void
  onSortChange: (value: SortMode) => void
  onToggleArchiveView: () => void
  onNewTopic: () => void
  onOpenStudyItems: () => void
  onDragStart: (topicId: string) => void
  onDragOver: (event: DragEvent<HTMLElement>, topicId: string) => void
  onDrop: (topicId: string) => void
  onDragEnd: () => void
  onStudy: (topicId: string) => void
  onEdit: (topicId: string) => void
  onArchive: (topicId: string) => void
}

function formatRelativeDate(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  if (days <= 0) return 'Bugün'
  if (days === 1) return 'Dün'
  return `${days} gün önce`
}

export function TopicsPage({ topics, visibleTopics, studyHistory, studyItems, showArchived, searchTerm, sortMode, onSearchChange, onSortChange, onToggleArchiveView, onNewTopic, onOpenStudyItems, onDragStart, onDragOver, onDrop, onDragEnd, onStudy, onEdit, onArchive }: TopicsPageProps) {
  const latestStudy = [...studyHistory].sort((first, second) => second.startedAt.localeCompare(first.startedAt))[0]
  const latestTopic = latestStudy ? topics.find((topic) => topic.id === latestStudy.topicId) : undefined
  const neglectedTopic = topics.filter((topic) => !studyHistory.some((study) => study.topicId === topic.id)).sort((first, second) => first.updatedAt.localeCompare(second.updatedAt))[0]
  const archiveScopedCount = topics.filter((topic) => Boolean(topic.archivedAt) === showArchived).length

  return <main className="topics" id="topics">
    <div className="page-heading">
      <p className="eyebrow">MERAK ALANIN</p>
      <h1>{showArchived ? 'Arşiv' : 'Konularım'}<span>.</span></h1>
      <p className="topic-count">{String(visibleTopics.length).padStart(2, '0')} / {String(archiveScopedCount).padStart(2, '0')} KONU</p>
    </div>

    {topics.length === 0 && !showArchived ? <section className="empty-home" aria-label="Boş konu durumu">
      <p className="manifesto">I WONDER HOW THIS WORKS.</p>
      <h2>Henüz bir öğrenme konusu yok.</h2>
      <button className="study-button" type="button" onClick={onNewTopic}>+ İlk konunu oluştur</button>
    </section> : <>
      <section className="learning-summary" aria-label="Kişisel öğrenme özeti">
        <div><p>DEVAM ET</p><strong>{latestTopic?.title ?? 'İlk konunu seç'}</strong><span>{latestStudy ? `Son çalışma: ${formatRelativeDate(latestStudy.startedAt)}` : 'Çalışmaya başla'}</span></div>
        <button type="button" onClick={onOpenStudyItems}><p>ÖĞRENECEKLER</p><strong>{studyItems.filter((item) => item.status === 'todo').length}</strong><span>bekleyen ifade</span></button>
        <div><p>GERİ DÖN</p><strong>{neglectedTopic?.title ?? 'Tüm konular güncel'}</strong><span>{neglectedTopic ? `${formatRelativeDate(neglectedTopic.updatedAt)} çalışılmadı` : 'Güzel gidiyorsun'}</span></div>
      </section>

      <div className="topic-toolbar">
        <label className="search-field"><span className="visually-hidden">Konularda ara</span><input type="search" value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="Konularda ara" /></label>
        <div className="toolbar-actions">
          <label className="sort-control"><span>Sırala</span><select value={sortMode} onChange={(event) => onSortChange(event.target.value as SortMode)}><option value="manual">Manuel</option><option value="last-studied">Son çalışılan</option><option value="newest">Yeni eklenen</option><option value="alphabetical">A-Z</option></select></label>
          <button className="archive-toggle" type="button" onClick={onToggleArchiveView}>{showArchived ? 'Konular' : 'Arşiv'}</button>
          <button className="new-topic" type="button" onClick={onNewTopic}><span>+</span> Yeni Konu</button>
        </div>
      </div>

      {visibleTopics.length === 0 ? <p className="empty-topics">{showArchived ? 'Arşivin boş.' : 'Bu aramaya uyan konu bulunamadı.'}</p> : <TopicGrid topics={visibleTopics} isDraggable={!showArchived && sortMode === 'manual'} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd} onStudy={onStudy} onEdit={onEdit} onArchive={onArchive} isArchived={showArchived}/>} 
    </>}
  </main>
}
