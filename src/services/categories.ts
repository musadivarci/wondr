import type { Category } from '../types'
import { supabase } from '../lib/supabase'
import { withCloudRetry } from './cloudRetry'

type CategoryRow = { user_id: string; id: string; name: string; parent_id: string | null; position: number; created_at: string; updated_at: string }

function clientOrThrow() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.')
  return supabase
}

function mapCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, parentId: row.parent_id, position: row.position, createdAt: row.created_at, updatedAt: row.updated_at }
}

export async function loadCategories(userId: string) {
  const client = clientOrThrow()
  try {
    return await withCloudRetry(client, async () => {
      const result = await client.from('categories').select('*').eq('user_id', userId).order('position')
      if (result.error) throw result.error
      return (result.data as CategoryRow[]).map(mapCategory)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('categories') || message.includes('PGRST')) return []
    throw error
  }
}

export async function saveCategory(userId: string, category: Category) {
  const result = await clientOrThrow().from('categories').upsert({ user_id: userId, id: category.id, name: category.name, parent_id: category.parentId, position: category.position, created_at: category.createdAt, updated_at: category.updatedAt }, { onConflict: 'user_id,id' })
  if (result.error) throw result.error
}

export async function saveCategories(userId: string, categories: Category[]) {
  if (!categories.length) return
  const rows = categories.map((category) => ({ user_id: userId, id: category.id, name: category.name, parent_id: category.parentId, position: category.position, created_at: category.createdAt, updated_at: category.updatedAt }))
  const result = await clientOrThrow().from('categories').upsert(rows, { onConflict: 'user_id,id' })
  if (result.error) throw result.error
}

export async function deleteCategory(userId: string, categoryId: string) {
  const result = await clientOrThrow().from('categories').delete().eq('user_id', userId).eq('id', categoryId)
  if (result.error) throw result.error
}
