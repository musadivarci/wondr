import type { Topic } from '../types'

function ArrowIcon() { return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" /></svg> }

type TopicCardProps = {
  topic: Topic
  index: number
  isDraggable: boolean
  onDragStart: (topicId: string) => void
  onDragOver: (event: React.DragEvent<HTMLElement>, topicId: string) => void
  onDrop: (topicId: string) => void
  onDragEnd: () => void
  onStudy: (topicId: string) => void
  onEdit: (topicId: string) => void
}

export function TopicCard({ topic, index, isDraggable, onDragStart, onDragOver, onDrop, onDragEnd, onStudy, onEdit }: TopicCardProps) {
  return <article className="topic-card" id={topic.id} draggable={isDraggable} onDragStart={() => onDragStart(topic.id)} onDragOver={(event) => onDragOver(event, topic.id)} onDrop={() => onDrop(topic.id)} onDragEnd={onDragEnd}>
    <a className="card-link" href={`#${topic.id}`} aria-label={`${topic.title} konusuna git`} />
    {isDraggable && <span className="drag-handle" aria-hidden="true">⋮⋮</span>}
    <div className="topic-number">{String(index + 1).padStart(2, '0')}</div>
    <div className="topic-copy"><p className="topic-label">KONU</p><h2>{topic.title}</h2><p className="topic-meta"><span>{topic.noteCount} not</span><i/><span>son çalışma {topic.lastStudied}</span></p><p className="topic-relations"><span>↑ {topic.parentTopicIds.length} üst</span><span>↓ {topic.childTopicIds.length} alt</span><span>↔ {topic.relatedTopicIds.length} ilişkili</span></p></div>
    <div className="topic-actions"><button className="study-button" type="button" onClick={() => onStudy(topic.id)}>Çalış <ArrowIcon/></button><button className="edit-button" type="button" onClick={() => onEdit(topic.id)}>Düzenle</button></div>
  </article>
}
