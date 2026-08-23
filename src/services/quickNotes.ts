import type { QuickNote } from '../types'
import { supabase } from '../lib/supabase'

export const quickNotesStorageKey = 'wondr-quick-notes'

type QuickNoteRow = {
  user_id: string
  id: string
  category: string
  content: string
  created_at: string
  updated_at: string
}

function clientOrThrow() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.')
  return supabase
}

function mapQuickNote(row: QuickNoteRow): QuickNote {
  return {
    id: row.id,
    category: row.category,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function readLocalQuickNotes() {
  try {
    const value = JSON.parse(window.localStorage.getItem(quickNotesStorageKey) ?? '[]')
    return Array.isArray(value) ? value as QuickNote[] : []
  } catch {
    return []
  }
}

export async function createQuickNoteFromText(content: string, category = 'Okumadan') {
  const cleanContent = content.trim()
  if (!cleanContent) throw new Error('Boş Short oluşturulamaz.')
  const now = new Date().toISOString()
  const note: QuickNote = {
    id: `quick-${Date.now()}`,
    category,
    content: cleanContent,
    createdAt: now,
    updatedAt: now,
  }
  const localNotes = readLocalQuickNotes()
  window.localStorage.setItem(quickNotesStorageKey, JSON.stringify([note, ...localNotes]))

  if (supabase) {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      try {
        await saveQuickNote(data.session.user.id, note)
      } catch {
        // Local-first: the Short remains safely on-device if cloud sync is temporarily unavailable.
      }
    }
  }
  return note
}

export async function loadQuickNotes(userId: string) {
  const result = await clientOrThrow()
    .from('quick_notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (result.error) throw result.error
  return (result.data as QuickNoteRow[]).map(mapQuickNote)
}

export async function saveQuickNote(userId: string, note: QuickNote) {
  const result = await clientOrThrow().from('quick_notes').upsert({
    user_id: userId,
    id: note.id,
    category: note.category,
    content: note.content,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  }, { onConflict: 'user_id,id' })
  if (result.error) throw result.error
}

export async function deleteQuickNote(userId: string, noteId: string) {
  const result = await clientOrThrow()
    .from('quick_notes')
    .delete()
    .eq('user_id', userId)
    .eq('id', noteId)
  if (result.error) throw result.error
}
