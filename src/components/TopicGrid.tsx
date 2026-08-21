import { TopicCard } from './TopicCard'
import type { Topic } from '../types'

type TopicGridProps = {
  topics: Topic[]
  isDraggable: boolean
  onDragStart: (topicId: string) => void
  onDragOver: (event: React.DragEvent<HTMLElement>, topicId: string) => void
  onDrop: (topicId: string) => void
  onDragEnd: () => void
  onStudy: (topicId: string) => void
  onEdit: (topicId: string) => void
}

export function TopicGrid({ topics, isDraggable, onDragStart, onDragOver, onDrop, onDragEnd, onStudy, onEdit }: TopicGridProps) {
  if (topics.length === 0) return <p className="empty-topics">Bu aramaya uyan konu bulunamadı.</p>

  return <section className="topic-list" aria-label="Konularım">{topics.map((topic, index) => <TopicCard key={topic.id} topic={topic} index={index} isDraggable={isDraggable} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd} onStudy={onStudy} onEdit={onEdit}/>)}</section>
}
