import { useMemo, useState } from 'react'
import type { Category, Topic } from '../types'
import './CategoryTreePage.css'

type CategoryTreePageProps = {
  categories: Category[]
  topics: Topic[]
  onBack: () => void
  onCreate: (name: string, parentId: string | null) => void
  onRename: (categoryId: string, name: string) => void
  onDelete: (categoryId: string) => void
  onMove: (categoryId: string, direction: 'up' | 'down') => void
  onChangeParent: (categoryId: string, parentId: string | null) => void
}

type TreeRow = { category: Category; depth: number }

function flatten(categories: Category[]): TreeRow[] {
  const rows: TreeRow[] = []
  function visit(parentId: string | null, depth: number) {
    categories.filter((category) => category.parentId === parentId).sort((a, b) => a.position - b.position).forEach((category) => {
      rows.push({ category, depth })
      visit(category.id, depth + 1)
    })
  }
  visit(null, 0)
  return rows
}

function descendantIds(categoryId: string, categories: Category[]) {
  const result = new Set<string>()
  const visit = (id: string) => {
    categories.filter((category) => category.parentId === id).forEach((child) => {
      result.add(child.id)
      visit(child.id)
    })
  }
  visit(categoryId)
  return result
}

export function CategoryTreePage({ categories, topics, onBack, onCreate, onRename, onDelete, onMove, onChangeParent }: CategoryTreePageProps) {
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const rows = useMemo(() => flatten(categories), [categories])

  function createCategory(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed, parentId || null)
    setName('')
  }

  return <main className="category-page" aria-labelledby="category-page-title">
    <button className="back-link" type="button" onClick={onBack}>← Geri dön</button>
    <header className="category-heading">
      <p className="eyebrow">BİLGİ MİMARİSİ</p>
      <h1 id="category-page-title">Kategori ağacı<span>.</span></h1>
      <p>Kategoriler konulardan bağımsızdır. Bir kategori, altında henüz hiç konu olmasa bile yapıda durabilir.</p>
    </header>

    <form className="category-create" onSubmit={createCategory}>
      <label className="form-field"><span>Yeni kategori</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Örn. AI Mühendisliği" /></label>
      <label className="form-field"><span>Üst kategori</span><select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">Kök kategori</option>{rows.map(({ category, depth }) => <option key={category.id} value={category.id}>{'— '.repeat(depth)}{category.name}</option>)}</select></label>
      <button className="study-button" type="submit">+ Kategori ekle</button>
    </form>

    {rows.length === 0 ? <section className="category-empty"><h2>Henüz kategori yok.</h2><p>İlk kategori ağacını buradan kurabilirsin.</p></section> : <section className="category-tree" aria-label="Kategori ağacı">
      {rows.map(({ category, depth }) => {
        const siblings = categories.filter((candidate) => candidate.parentId === category.parentId).sort((a, b) => a.position - b.position)
        const siblingIndex = siblings.findIndex((candidate) => candidate.id === category.id)
        const topicCount = topics.filter((topic) => topic.categoryId === category.id).length
        const blockedParentIds = descendantIds(category.id, categories)
        blockedParentIds.add(category.id)
        return <article className="category-row" key={category.id} style={{ '--category-depth': depth } as React.CSSProperties}>
          <div className="category-tree-mark" aria-hidden="true"><span/></div>
          <div className="category-main">
            {editingId === category.id ? <form className="category-rename" onSubmit={(event) => { event.preventDefault(); if (editingName.trim()) onRename(category.id, editingName.trim()); setEditingId(null) }}><input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} /><button type="submit">Kaydet</button><button type="button" onClick={() => setEditingId(null)}>İptal</button></form> : <><strong>{category.name}</strong><small>{topicCount} konu · seviye {depth + 1}</small></>}
          </div>
          <label className="category-parent-select"><span className="visually-hidden">Üst kategori</span><select aria-label={`${category.name} üst kategorisi`} value={category.parentId ?? ''} onChange={(event) => onChangeParent(category.id, event.target.value || null)}><option value="">Kök</option>{rows.filter(({ category: option }) => !blockedParentIds.has(option.id)).map(({ category: option, depth: optionDepth }) => <option key={option.id} value={option.id}>{'— '.repeat(optionDepth)}{option.name}</option>)}</select></label>
          <div className="category-actions">
            <button type="button" disabled={siblingIndex <= 0} onClick={() => onMove(category.id, 'up')} aria-label={`${category.name} yukarı taşı`}>↑</button>
            <button type="button" disabled={siblingIndex === siblings.length - 1} onClick={() => onMove(category.id, 'down')} aria-label={`${category.name} aşağı taşı`}>↓</button>
            <button type="button" onClick={() => { setEditingId(category.id); setEditingName(category.name) }}>Düzenle</button>
            <button type="button" className="category-delete" onClick={() => onDelete(category.id)}>Sil</button>
          </div>
        </article>
      })}
    </section>}
  </main>
}
