import type { SupabaseClient } from '@supabase/supabase-js'
import type { Topic } from '../types'
import { supabase } from '../lib/supabase'
import { withCloudRetry } from './cloudRetry'

type TopicRow = { user_id: string; id: string; title: string; notes: string; note_count: number; category_id?: string | null; created_at: string; updated_at: string; last_studied_at: string | null; archived_at: string | null }
type RelationRow = { user_id: string; source_topic_id: string; target_topic_id: string; relation_type: 'parent' | 'child' | 'related' }
type OrderRow = { user_id: string; topic_id: string; position: number }

function clientOrThrow() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.')
  return supabase
}

function buildTopics(rows: TopicRow[], relations: RelationRow[], order: OrderRow[]) {
  const topics = rows.map((row) => ({
    id: row.id,
    title: row.title,
    notes: row.notes,
    noteCount: row.note_count,
    categoryId: row.category_id ?? undefined,
    parentTopicIds: [],
    childTopicIds: [],
    relatedTopicIds: [],
    lastStudied: row.last_studied_at ? new Date(row.last_studied_at).toLocaleDateString('tr-TR') : 'Henüz çalışılmadı',
    lastStudiedAt: row.last_studied_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) as Topic[]
  const byId = new Map(topics.map((topic) => [topic.id, topic]))
  relations.forEach((relation) => {
    const source = byId.get(relation.source_topic_id)
    const target = byId.get(relation.target_topic_id)
    if (!source || !target) return
    if (relation.relation_type === 'related') {
      source.relatedTopicIds.push(target.id)
      target.relatedTopicIds.push(source.id)
    } else {
      source.childTopicIds.push(target.id)
      target.parentTopicIds.push(source.id)
    }
  })
  const orderById = new Map(order.map((row) => [row.topic_id, row.position]))
  return topics.sort((first, second) => (orderById.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (orderById.get(second.id) ?? Number.MAX_SAFE_INTEGER))
}

export async function loadCloudTopics(userId: string) {
  const client = clientOrThrow()
  return withCloudRetry(client, async () => {
    const [topicsResult, relationsResult, orderResult] = await Promise.all([
      client.from('topics').select('*').eq('user_id', userId),
      client.from('topic_relations').select('user_id,source_topic_id,target_topic_id,relation_type').eq('user_id', userId),
      client.from('topic_order').select('user_id,topic_id,position').eq('user_id', userId).order('position'),
    ])
    if (topicsResult.error) throw topicsResult.error
    if (relationsResult.error) throw relationsResult.error
    if (orderResult.error) throw orderResult.error
    return buildTopics(topicsResult.data as TopicRow[], relationsResult.data as RelationRow[], orderResult.data as OrderRow[])
  })
}

function relationRows(userId: string, topic: Topic): RelationRow[] {
  const rows: RelationRow[] = []
  topic.parentTopicIds.forEach((parentId) => rows.push({ user_id: userId, source_topic_id: parentId, target_topic_id: topic.id, relation_type: 'parent' }))
  topic.childTopicIds.forEach((childId) => rows.push({ user_id: userId, source_topic_id: topic.id, target_topic_id: childId, relation_type: 'parent' }))
  topic.relatedTopicIds.forEach((relatedId) => {
    if (topic.id < relatedId) rows.push({ user_id: userId, source_topic_id: topic.id, target_topic_id: relatedId, relation_type: 'related' })
  })
  return rows
}

function allRelationRows(userId: string, topics: Topic[]) {
  const rows = topics.flatMap((topic) => relationRows(userId, topic))
  return [...new Map(rows.map((row) => [`${row.source_topic_id}-${row.target_topic_id}-${row.relation_type}`, row])).values()]
}

function topicRow(userId: string, topic: Topic) {
  return {
    user_id: userId,
    id: topic.id,
    title: topic.title,
    notes: topic.notes,
    note_count: topic.noteCount,
    ...(topic.categoryId !== undefined ? { category_id: topic.categoryId || null } : {}),
    created_at: topic.createdAt,
    updated_at: topic.updatedAt,
    last_studied_at: topic.lastStudiedAt ?? null,
    archived_at: topic.archivedAt ?? null,
  }
}

export async function saveCloudTopic(userId: string, topic: Topic) {
  const client = clientOrThrow()
  const saved = await client.from('topics').upsert(topicRow(userId, topic), { onConflict: 'user_id,id' })
  if (saved.error) throw saved.error
  const removed = await client.from('topic_relations').delete().eq('user_id', userId).or(`source_topic_id.eq.${topic.id},target_topic_id.eq.${topic.id}`)
  if (removed.error) throw removed.error
  const relations = relationRows(userId, topic)
  if (relations.length) {
    const inserted = await client.from('topic_relations').upsert(relations, { onConflict: 'user_id,source_topic_id,target_topic_id,relation_type' })
    if (inserted.error) throw inserted.error
  }
}

export async function saveCloudOrder(userId: string, order: string[]) {
  const client = clientOrThrow()
  const rows = order.map((topicId, position) => ({ user_id: userId, topic_id: topicId, position }))
  const result = await client.from('topic_order').upsert(rows, { onConflict: 'user_id,topic_id' })
  if (result.error) throw result.error
}

export async function deleteCloudTopic(userId: string, topicId: string) {
  const result = await clientOrThrow().from('topics').delete().eq('user_id', userId).eq('id', topicId)
  if (result.error) throw result.error
}

export type LocalSnapshot = { topics: Topic[]; topicOrder: string[]; studyItems: unknown[]; studyHistory: unknown[]; highlights: unknown[]; notes: unknown[] }

export async function migrateTopics(userId: string, snapshot: LocalSnapshot, studyMigration: (client: SupabaseClient, userId: string, snapshot: LocalSnapshot) => Promise<void>) {
  const client = clientOrThrow()
  const topicRows = snapshot.topics.map((topic) => topicRow(userId, topic))
  if (topicRows.length) {
    const topicsResult = await client.from('topics').upsert(topicRows, { onConflict: 'user_id,id' })
    if (topicsResult.error) throw topicsResult.error
  }
  const cleared = await client.from('topic_relations').delete().eq('user_id', userId)
  if (cleared.error) throw cleared.error
  const relations = allRelationRows(userId, snapshot.topics)
  if (relations.length) {
    const relationsResult = await client.from('topic_relations').upsert(relations, { onConflict: 'user_id,source_topic_id,target_topic_id,relation_type' })
    if (relationsResult.error) throw relationsResult.error
  }
  await saveCloudOrder(userId, snapshot.topicOrder)
  await studyMigration(client, userId, snapshot)
}
