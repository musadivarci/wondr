import type { Topic } from '../types'

type LearningPathProps = {
  topics: Topic[]
  onOpenTopic: (topicId: string) => void
}

function PathNode({ topic, topics, visited, onOpenTopic }: { topic: Topic; topics: Topic[]; visited: Set<string>; onOpenTopic: (topicId: string) => void }) {
  const childIds = [...new Set([...topic.childTopicIds, ...topics.filter((candidate) => candidate.parentTopicIds.includes(topic.id)).map((candidate) => candidate.id)])]
    .filter((id) => !visited.has(id))
  const nextVisited = new Set(visited).add(topic.id)

  return <li className="path-node">
    <button type="button" onClick={() => onOpenTopic(topic.id)}>{topic.title}</button>
    {childIds.length > 0 && <ul>{childIds.map((childId) => {
      const child = topics.find((candidate) => candidate.id === childId)
      return child ? <PathNode key={child.id} topic={child} topics={topics} visited={nextVisited} onOpenTopic={onOpenTopic}/> : null
    })}</ul>}
  </li>
}

export function LearningPath({ topics, onOpenTopic }: LearningPathProps) {
  const roots = topics.filter((topic) => topic.parentTopicIds.every((parentId) => !topics.some((candidate) => candidate.id === parentId)))
  const relatedLinks = topics.flatMap((topic) => topic.relatedTopicIds.map((relatedId) => ({ topic, related: topics.find((candidate) => candidate.id === relatedId) })))
    .filter((link): link is { topic: Topic; related: Topic } => {
      if (!link.related) return false
      return link.topic.id < link.related.id
    })

  return <main className="learning-path-page" aria-labelledby="learning-path-title">
    <header className="path-heading"><p className="eyebrow">YAPIN</p><h1 id="learning-path-title">Learning Path<span>.</span></h1><p>Konuların arasındaki yönleri takip et.</p></header>
    <section className="path-structure" aria-label="Hiyerarşik öğrenme yolları">
      {roots.length === 0 ? <p className="empty-topics">Henüz bir öğrenme yolu oluşmadı.</p> : <ul className="path-tree">{roots.map((topic) => <PathNode key={topic.id} topic={topic} topics={topics} visited={new Set()} onOpenTopic={onOpenTopic}/>)}</ul>}
    </section>
    {relatedLinks.length > 0 && <section className="related-paths" aria-label="İlişkili konular"><p className="eyebrow">İLİŞKİLİ BAĞLANTILAR</p>{relatedLinks.map(({ topic, related }) => <div className="related-path" key={`${topic.id}-${related.id}`}><button type="button" onClick={() => onOpenTopic(topic.id)}>{topic.title}</button><span>↔</span><button type="button" onClick={() => onOpenTopic(related.id)}>{related.title}</button></div>)}</section>}
  </main>
}