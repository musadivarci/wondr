import { useMemo, useRef, useState } from 'react'
import type { StudyHistory, Topic } from '../types'

type KnowledgeMapProps = {
  topics: Topic[]
  studyHistory: StudyHistory[]
  onStudy: (topicId: string) => void
  onEdit: (topicId: string) => void
  onOpenTopic: (topicId: string) => void
  onCreateTopic: () => void
}

type Point = { x: number; y: number }
type Edge = { from: string; to: string; related: boolean }

const mapWidth = 1120
const mapHeight = 660

function graphEdges(topics: Topic[]) {
  const edgeMap = new Map<string, Edge>()
  topics.forEach((topic) => {
    topic.childTopicIds.forEach((to) => edgeMap.set(`${topic.id}-${to}-hierarchy`, { from: topic.id, to, related: false }))
    topic.parentTopicIds.forEach((from) => edgeMap.set(`${from}-${topic.id}-hierarchy`, { from, to: topic.id, related: false }))
    topic.relatedTopicIds.forEach((to) => {
      const key = [topic.id, to].sort().join('-')
      if (!edgeMap.has(`${key}-related`)) edgeMap.set(`${key}-related`, { from: topic.id, to, related: true })
    })
  })
  return [...edgeMap.values()]
}

function initialPositions(topics: Topic[]) {
  const positions = topics.reduce<Record<string, Point>>((result, topic, index) => {
    const angle = (index / Math.max(topics.length, 1)) * Math.PI * 2
    result[topic.id] = { x: mapWidth / 2 + Math.cos(angle) * 260, y: mapHeight / 2 + Math.sin(angle) * 205 }
    return result
  }, {})
  const edges = graphEdges(topics)
  for (let iteration = 0; iteration < 90; iteration += 1) {
    const forces = topics.reduce<Record<string, Point>>((result, topic) => { result[topic.id] = { x: 0, y: 0 }; return result }, {})
    topics.forEach((topic, index) => topics.slice(index + 1).forEach((other) => {
      const first = positions[topic.id]
      const second = positions[other.id]
      const dx = first.x - second.x
      const dy = first.y - second.y
      const distance = Math.max(Math.hypot(dx, dy), 1)
      const force = 2100 / (distance * distance)
      forces[topic.id].x += (dx / distance) * force
      forces[topic.id].y += (dy / distance) * force
      forces[other.id].x -= (dx / distance) * force
      forces[other.id].y -= (dy / distance) * force
    }))
    edges.forEach((edge) => {
      const from = positions[edge.from]
      const to = positions[edge.to]
      if (!from || !to) return
      const dx = to.x - from.x
      const dy = to.y - from.y
      const distance = Math.max(Math.hypot(dx, dy), 1)
      const force = (distance - (edge.related ? 190 : 150)) * .003
      forces[edge.from].x += (dx / distance) * force
      forces[edge.from].y += (dy / distance) * force
      forces[edge.to].x -= (dx / distance) * force
      forces[edge.to].y -= (dy / distance) * force
    })
    topics.forEach((topic) => {
      positions[topic.id].x = Math.min(mapWidth - 105, Math.max(105, positions[topic.id].x + forces[topic.id].x))
      positions[topic.id].y = Math.min(mapHeight - 55, Math.max(55, positions[topic.id].y + forces[topic.id].y))
    })
  }
  return positions
}

function topicNames(ids: string[], topics: Topic[]) {
  return ids.map((id) => topics.find((topic) => topic.id === id)?.title).filter((title): title is string => Boolean(title))
}

export function KnowledgeMap({ topics, studyHistory, onStudy, onEdit, onOpenTopic, onCreateTopic }: KnowledgeMapProps) {
  const [positions, setPositions] = useState<Record<string, Point>>(() => initialPositions(topics))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState<{ id: string | null; start: Point; origin: Point } | null>(null)
  const [panning, setPanning] = useState<{ start: Point; origin: Point } | null>(null)
  const lastNodePointer = useRef<{ id: string; time: number } | null>(null)
  const layoutPositions = useMemo(() => initialPositions(topics), [topics])

  const edges = useMemo(() => graphEdges(topics).filter((edge) => layoutPositions[edge.from] && layoutPositions[edge.to]), [layoutPositions, topics])

  const selectedTopic = topics.find((topic) => topic.id === selectedId)
  const connectedIds = selectedTopic ? new Set([selectedTopic.id, ...selectedTopic.parentTopicIds, ...selectedTopic.childTopicIds, ...selectedTopic.relatedTopicIds]) : null
  const historyFor = (topicId: string) => studyHistory.filter((study) => study.topicId === topicId)

  function pointerPoint(event: React.PointerEvent<SVGSVGElement> | React.PointerEvent<SVGGElement>) {
    const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement
    const bounds = svg?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    return { x: (event.clientX - bounds.left - offset.x) / scale, y: (event.clientY - bounds.top - offset.y) / scale }
  }

  function movePointer(event: React.PointerEvent<SVGSVGElement>) {
    if (dragging) {
      const point = pointerPoint(event)
      setPositions((current) => ({ ...current, [dragging.id as string]: { x: dragging.origin.x + point.x - dragging.start.x, y: dragging.origin.y + point.y - dragging.start.y } }))
    } else if (panning) {
      setOffset({ x: panning.origin.x + event.clientX - panning.start.x, y: panning.origin.y + event.clientY - panning.start.y })
    }
  }

  function zoom(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault()
    setScale((current) => Math.min(1.7, Math.max(.65, current - event.deltaY * .001)))
  }

  function selectNode(event: React.PointerEvent<SVGGElement>, topic: Topic, point: Point) {
    event.stopPropagation()
    const now = event.timeStamp
    if (lastNodePointer.current?.id === topic.id && now - lastNodePointer.current.time < 400) onOpenTopic(topic.id)
    lastNodePointer.current = { id: topic.id, time: now }
    setSelectedId(topic.id)
    setDragging({ id: topic.id, start: pointerPoint(event), origin: point })
  }

  return <main className="knowledge-map-page" aria-labelledby="knowledge-map-title">
    <header className="map-heading"><div><p className="eyebrow">AĞIN</p><h1 id="knowledge-map-title">Knowledge Map<span>.</span></h1><p>{topics.length} konu · {edges.length} bağlantı</p></div><div className="map-legend"><span><i className="hierarchy-key"/> Hiyerarşi</span><span><i className="related-key"/> İlişkili</span></div></header>
    {topics.length === 0 ? <section className="map-empty" aria-label="Boş bilgi haritası"><p>İlk konunu oluşturduğunda bilgi haritan burada büyümeye başlayacak.</p><button className="study-button" type="button" onClick={onCreateTopic}>+ İlk konunu oluştur</button></section> : <section className="map-workspace" aria-label="Görsel bilgi ağı">
      <div className="map-tools"><button type="button" onClick={() => setScale((current) => Math.min(1.7, current + .12))} aria-label="Yakınlaştır">+</button><span>{Math.round(scale * 100)}%</span><button type="button" onClick={() => setScale((current) => Math.max(.65, current - .12))} aria-label="Uzaklaştır">−</button><button type="button" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }} aria-label="Görünümü sıfırla">Sıfırla</button></div>
      <svg className="knowledge-map" viewBox={`0 0 ${mapWidth} ${mapHeight}`} role="application" aria-label="Konu grafiği" onWheel={zoom} onPointerMove={movePointer} onPointerUp={() => { setDragging(null); setPanning(null) }} onPointerLeave={() => { setDragging(null); setPanning(null) }} onPointerDown={(event) => { if (event.target === event.currentTarget) setPanning({ start: { x: event.clientX, y: event.clientY }, origin: offset }) }}>
        <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
          {edges.map((edge) => { const from = positions[edge.from] ?? layoutPositions[edge.from]; const to = positions[edge.to] ?? layoutPositions[edge.to]; return <line className={edge.related ? 'map-edge related' : 'map-edge'} key={`${edge.from}-${edge.to}-${edge.related}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/> })}
          {topics.map((topic) => { const point = positions[topic.id] ?? layoutPositions[topic.id]; const count = historyFor(topic.id).length; const isDimmed = Boolean(connectedIds && !connectedIds.has(topic.id)); return <g className={`map-node ${selectedId === topic.id ? 'is-selected' : ''} ${isDimmed ? 'is-dimmed' : ''}`} key={topic.id} transform={`translate(${point.x} ${point.y})`} onPointerDown={(event) => selectNode(event, topic, point)} onClick={() => setSelectedId(topic.id)} onDoubleClick={() => onOpenTopic(topic.id)}><rect x="-92" y="-34" width="184" height="68" rx="3"/><text className="map-node-title" textAnchor="middle" y="-3">{topic.title}</text><text className="map-node-status" textAnchor="middle" y="18">{count ? `${count} çalışma` : 'Henüz çalışılmadı'}</text></g> })}
        </g>
      </svg>
      {selectedTopic && <aside className="map-detail" aria-label={`${selectedTopic.title} detayları`}><button className="map-detail-close" type="button" onClick={() => setSelectedId(null)} aria-label="Detay panelini kapat">×</button><p className="eyebrow">SEÇİLİ KONU</p><h2>{selectedTopic.title}</h2><div className="map-detail-groups"><div><span>ÜST KONULAR</span><p>{topicNames(selectedTopic.parentTopicIds, topics).join(' · ') || 'Yok'}</p></div><div><span>ALT KONULAR</span><p>{topicNames(selectedTopic.childTopicIds, topics).join(' · ') || 'Yok'}</p></div><div><span>İLİŞKİLİ</span><p>{topicNames(selectedTopic.relatedTopicIds, topics).join(' · ') || 'Yok'}</p></div></div><p className="map-detail-meta">Son çalışma: {selectedTopic.lastStudied}<br/>{historyFor(selectedTopic.id).length} çalışma</p><div className="map-detail-actions"><button className="study-button" type="button" onClick={() => onStudy(selectedTopic.id)}>Çalış</button><button className="edit-button" type="button" onClick={() => onEdit(selectedTopic.id)}>Düzenle</button></div></aside>}
    </section>}
  </main>
}