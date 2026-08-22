import type { SupabaseClient } from '@supabase/supabase-js'
import type { Highlight, StudyHistory, StudyItem } from '../types'
import type { LocalSnapshot } from './topics'
import { supabase } from '../lib/supabase'
import { withCloudRetry } from './cloudRetry'

type StudyItemRow = { user_id: string; id: string; text: string; topic_id: string; source_excerpt: string; created_at: string; status: 'todo' | 'done' }
type StudyHistoryRow = { user_id: string; id: string; topic_id: string; started_at: string }
type HighlightRow = { user_id: string; id: string; topic_id: string; selected_text: string; start_offset: number; end_offset: number; context_before: string; context_after: string; created_at: string }

function clientOrThrow() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.')
  return supabase
}

export async function loadCloudStudy(userId: string) {
  const client = clientOrThrow()
  return withCloudRetry(client, async () => {
    const [itemsResult, historyResult, highlightsResult] = await Promise.all([
      client.from('study_items').select('*').eq('user_id', userId),
      client.from('study_history').select('*').eq('user_id', userId).order('started_at', { ascending: false }),
      client.from('highlights').select('*').eq('user_id', userId),
    ])
    if (itemsResult.error) throw itemsResult.error
    if (historyResult.error) throw historyResult.error
    if (highlightsResult.error) throw highlightsResult.error
    const items = (itemsResult.data as StudyItemRow[]).map((item) => ({ id: item.id, text: item.text, topicId: item.topic_id, sourceExcerpt: item.source_excerpt, createdAt: item.created_at, status: item.status }))
    const history = (historyResult.data as StudyHistoryRow[]).map((study) => ({ id: study.id, topicId: study.topic_id, startedAt: study.started_at }))
    const highlights = (highlightsResult.data as HighlightRow[]).map((highlight) => ({ id: highlight.id, topicId: highlight.topic_id, selectedText: highlight.selected_text, startOffset: highlight.start_offset, endOffset: highlight.end_offset, contextBefore: highlight.context_before, contextAfter: highlight.context_after, createdAt: highlight.created_at }))
    return { items, history, highlights }
  })
}

export async function saveCloudStudyItem(userId: string, item: StudyItem) {
  const result = await clientOrThrow().from('study_items').upsert({ user_id: userId, id: item.id, text: item.text, topic_id: item.topicId, source_excerpt: item.sourceExcerpt, created_at: item.createdAt, status: item.status }, { onConflict: 'user_id,id' })
  if (result.error) throw result.error
}

export async function saveCloudHistory(userId: string, study: StudyHistory) {
  const result = await clientOrThrow().from('study_history').upsert({ user_id: userId, id: study.id, topic_id: study.topicId, started_at: study.startedAt }, { onConflict: 'user_id,id' })
  if (result.error) throw result.error
}

export async function saveCloudHighlight(userId: string, highlight: Highlight) {
  const result = await clientOrThrow().from('highlights').upsert({ user_id: userId, id: highlight.id, topic_id: highlight.topicId, selected_text: highlight.selectedText, start_offset: highlight.startOffset, end_offset: highlight.endOffset, context_before: highlight.contextBefore ?? '', context_after: highlight.contextAfter ?? '', created_at: highlight.createdAt }, { onConflict: 'user_id,id' })
  if (result.error) throw result.error
}

export async function deleteCloudHighlight(userId: string, highlightId: string) {
  const result = await clientOrThrow().from('highlights').delete().eq('user_id', userId).eq('id', highlightId)
  if (result.error) throw result.error
}

export async function migrateStudy(client: SupabaseClient, userId: string, snapshot: LocalSnapshot) {
  const items = snapshot.studyItems as StudyItem[]
  const history = snapshot.studyHistory as StudyHistory[]
  if (items.length) {
    const result = await client.from('study_items').upsert(items.map((item) => ({ user_id: userId, id: item.id, text: item.text, topic_id: item.topicId, source_excerpt: item.sourceExcerpt, created_at: item.createdAt, status: item.status })), { onConflict: 'user_id,id' })
    if (result.error) throw result.error
  }
  if (history.length) {
    const result = await client.from('study_history').upsert(history.map((study) => ({ user_id: userId, id: study.id, topic_id: study.topicId, started_at: study.startedAt })), { onConflict: 'user_id,id' })
    if (result.error) throw result.error
  }
  const highlights = snapshot.highlights as Highlight[]
  if (highlights.length) {
    const result = await client.from('highlights').upsert(highlights.map((highlight) => ({ user_id: userId, id: highlight.id, topic_id: highlight.topicId, selected_text: highlight.selectedText, start_offset: highlight.startOffset, end_offset: highlight.endOffset, context_before: highlight.contextBefore ?? '', context_after: highlight.contextAfter ?? '', created_at: highlight.createdAt })), { onConflict: 'user_id,id' })
    if (result.error) throw result.error
  }
}
