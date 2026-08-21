import { useState } from 'react'
import type { Topic, TopicFormValues } from '../types'

type TopicFormProps = {
  topic?: Topic
  topics: Topic[]
  onCancel: () => void
  onSave: (values: TopicFormValues) => void
  initialTitle?: string
  sourceTopicTitle?: string
}

function getInitialValues(topic?: Topic, initialTitle?: string): TopicFormValues {
  return {
    title: topic?.title ?? initialTitle ?? '',
    notes: topic?.notes ?? '',
    parentTopicId: topic?.parentTopicIds[0] ?? '',
    childTopicId: topic?.childTopicIds[0] ?? '',
    relatedTopicId: topic?.relatedTopicIds[0] ?? '',
  }
}

export function TopicForm({ topic, topics, onCancel, onSave, initialTitle, sourceTopicTitle }: TopicFormProps) {
  const [values, setValues] = useState<TopicFormValues>(() => getInitialValues(topic, initialTitle))
  const availableTopics = topics.filter((candidate) => candidate.id !== topic?.id)

  function updateValue(field: keyof TopicFormValues, value: string) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(values)
  }

  return <main className="topic-form-page" aria-labelledby="topic-form-title">
    <button className="back-link" type="button" onClick={onCancel}>← Konulara dön</button>
    <div className="form-heading"><p className="eyebrow">{topic ? 'KONU DÜZENLE' : 'YENİ MERAK ALANI'}</p><h1 id="topic-form-title">{topic ? 'Konuyu düzenle' : 'Yeni konu'}<span>.</span></h1></div>
    <form className="topic-form" onSubmit={handleSubmit}>
      {sourceTopicTitle && <p className="source-topic-note">Kaynak konu: <strong>{sourceTopicTitle}</strong></p>}
      <label className="form-field form-field-wide"><span>Konu adı</span><input required autoFocus value={values.title} onChange={(event) => updateValue('title', event.target.value)} placeholder="Örn. Tasarım sistemleri" /></label>
      <label className="form-field form-field-wide"><span>Notlar</span><textarea value={values.notes} onChange={(event) => updateValue('notes', event.target.value)} placeholder="Bu konu hakkında düşüncelerini yaz..." rows={9} /></label>
      <div className="relationship-fields"><label className="form-field"><span>Üst Konu</span><select value={values.parentTopicId} onChange={(event) => updateValue('parentTopicId', event.target.value)}><option value="">Seçilmedi</option>{availableTopics.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label><label className="form-field"><span>Alt Konu</span><select value={values.childTopicId} onChange={(event) => updateValue('childTopicId', event.target.value)}><option value="">Seçilmedi</option>{availableTopics.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label><label className="form-field"><span>İlişkili Konu</span><select value={values.relatedTopicId} onChange={(event) => updateValue('relatedTopicId', event.target.value)}><option value="">Seçilmedi</option>{availableTopics.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label></div>
      <div className="form-actions"><button className="edit-button" type="button" onClick={onCancel}>İptal</button><button className="study-button" type="submit">Kaydet</button></div>
    </form>
  </main>
}
