export type Topic = {
  id: string
  title: string
  notes: string
  noteCount: number
  parentTopicIds: string[]
  childTopicIds: string[]
  relatedTopicIds: string[]
  lastStudied: string
  lastStudiedAt?: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export type TopicFormValues = {
  title: string
  notes: string
  parentTopicId: string
  childTopicId: string
  relatedTopicId: string
}

export type StudyItem = {
  id: string
  text: string
  topicId: string
  sourceExcerpt: string
  createdAt: string
  status: 'todo' | 'done'
}

export type StudyHistory = {
  id: string
  topicId: string
  startedAt: string
}

export type Highlight = {
  id: string
  topicId: string
  selectedText: string
  startOffset: number
  endOffset: number
  createdAt: string
  contextBefore?: string
  contextAfter?: string
}

export type Note = {
  id: string
  topicId: string
  content: string
  createdAt: string
  updatedAt: string
  studyHistoryId?: string
}
