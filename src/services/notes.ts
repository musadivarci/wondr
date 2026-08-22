import type { SupabaseClient } from '@supabase/supabase-js'
import type { Note } from '../types'
import type { LocalSnapshot } from './topics'
import { supabase } from '../lib/supabase'
import { withCloudRetry } from './cloudRetry'

type NoteRow = { user_id: string; id: string; topic_id: string; content: string; study_history_id: string | null; created_at: string; updated_at: string }

function clientOrThrow() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.')
  return supabase
}

function mapNote(note: NoteRow): Note {
  return { id: note.id, topicId: note.topic_id, content: note.content, studyHistoryId: note.study_history_id ?? undefined, createdAt: note.created_at, updatedAt: note.updated_at }
}

export async function loadCloudNotes(userId: string) {
  const client = clientOrThrow()
  return withCloudRetry(client, async () => {
    const result = await client.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (result.error) throw result.error
    return (result.data as NoteRow[]).map(mapNote)
  })
}

export async function saveCloudNote(userId: string, note: Note) {
  const result = await clientOrThrow().from('notes').upsert({ user_id: userId, id: note.id, topic_id: note.topicId, content: note.content, study_history_id: note.studyHistoryId ?? null, created_at: note.createdAt, updated_at: note.updatedAt }, { onConflict: 'user_id,id' })
  if (result.error) throw result.error
}

export async function deleteCloudNote(userId: string, noteId: string) {
  const result = await clientOrThrow().from('notes').delete().eq('user_id', userId).eq('id', noteId)
  if (result.error) throw result.error
}

export async function migrateNotes(client: SupabaseClient, userId: string, snapshot: LocalSnapshot) {
  const notes = snapshot.notes as Note[]
  if (!notes.length) return
  const result = await client.from('notes').upsert(notes.map((note) => ({ user_id: userId, id: note.id, topic_id: note.topicId, content: note.content, study_history_id: note.studyHistoryId ?? null, created_at: note.createdAt, updated_at: note.updatedAt })), { onConflict: 'user_id,id' })
  if (result.error) throw result.error
}
