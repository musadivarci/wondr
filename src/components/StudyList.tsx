import type { StudyItem, Topic } from '../types'

type StudyListProps = {
  items: StudyItem[]
  topics: Topic[]
  onBack: () => void
  onConvert: (item: StudyItem) => void
  onComplete: (itemId: string) => void
}

export function StudyList({ items, topics, onBack, onConvert, onComplete }: StudyListProps) {
  return <main className="study-list-page" aria-labelledby="study-list-title">
    <button className="back-link" type="button" onClick={onBack}>← Konulara dön</button>
    <div className="study-list-heading"><p className="eyebrow">BİRİKTİRDİKLERİN</p><h1 id="study-list-title">Öğrenecekler<span>.</span></h1><p>{items.length} ifade</p></div>
    <section className="study-items" aria-label="Çalışmam gerekli listesi">
      {items.length === 0 && <p className="empty-topics">Henüz öğrenmek için işaretlediğin bir şey yok.</p>}
      {items.map((item) => <article className={`study-item ${item.status === 'done' ? 'is-done' : ''}`} key={item.id}>
        <p className="study-item-text">“{item.text}”</p>
        <div className="study-item-meta"><span>{topics.find((topic) => topic.id === item.topicId)?.title ?? 'Bilinmeyen konu'}</span><i/><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</time></div>
        <div className="study-item-actions">{item.status === 'todo' && <button className="study-item-link" type="button" onClick={() => onConvert(item)}>Konuya dönüştür</button>}<button className="study-item-link" type="button" onClick={() => onComplete(item.id)}>{item.status === 'done' ? 'Tamamlandı' : 'Tamamlandı'}</button></div>
      </article>)}
    </section>
  </main>
}
