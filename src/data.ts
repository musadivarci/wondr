import type { Topic } from './types'

export const initialTopics: Topic[] = [
  { id: 'artificial-intelligence', title: 'Yapay Zekâ', notes: 'Makine öğrenmesi, üretken modeller ve yapay zekânın nasıl çalıştığı üzerine notlar.', noteCount: 12, parentTopicIds: [], childTopicIds: ['machine-learning'], relatedTopicIds: ['rest-api'], lastStudied: 'Bugün, 18:40', createdAt: '2026-08-08T09:20:00Z', updatedAt: '2026-08-20T18:40:00Z' },
  { id: 'linux-kernel', title: 'Linux Kernel', notes: 'Çekirdek mimarisi, süreç yönetimi ve sistem çağrıları.', noteCount: 8, parentTopicIds: ['operating-systems'], childTopicIds: [], relatedTopicIds: ['computer-networks'], lastStudied: 'Dün, 12:15', createdAt: '2026-08-10T14:10:00Z', updatedAt: '2026-08-19T12:15:00Z' },
  { id: 'rest-api', title: 'REST API', notes: 'Kaynak tabanlı API tasarımı, HTTP fiilleri ve güvenli uç noktalar.', noteCount: 6, parentTopicIds: ['web-development'], childTopicIds: [], relatedTopicIds: ['artificial-intelligence', 'database-design'], lastStudied: '18 Ağu, 16:25', createdAt: '2026-08-12T11:00:00Z', updatedAt: '2026-08-18T16:25:00Z' },
  { id: 'machine-learning', title: 'Makine Öğrenmesi', notes: 'Denetimli ve denetimsiz öğrenme, veri hazırlama ve model değerlendirme.', noteCount: 15, parentTopicIds: ['artificial-intelligence'], childTopicIds: [], relatedTopicIds: ['statistics'], lastStudied: '17 Ağu, 09:10', createdAt: '2026-08-07T10:30:00Z', updatedAt: '2026-08-17T09:10:00Z' },
  { id: 'operating-systems', title: 'İşletim Sistemleri', notes: 'İşletim sistemi kavramları, bellek ve dosya sistemleri.', noteCount: 10, parentTopicIds: [], childTopicIds: ['linux-kernel'], relatedTopicIds: ['computer-networks'], lastStudied: '16 Ağu, 14:50', createdAt: '2026-08-05T08:00:00Z', updatedAt: '2026-08-16T14:50:00Z' },
  { id: 'web-development', title: 'Web Geliştirme', notes: 'Tarayıcılar, frontend mimarileri ve erişilebilir web deneyimleri.', noteCount: 9, parentTopicIds: [], childTopicIds: ['rest-api'], relatedTopicIds: ['user-experience'], lastStudied: '15 Ağu, 11:35', createdAt: '2026-08-04T13:45:00Z', updatedAt: '2026-08-15T11:35:00Z' },
  { id: 'database-design', title: 'Veritabanı Tasarımı', notes: 'İlişkisel modelleme, indeksler ve sorgu performansı.', noteCount: 7, parentTopicIds: [], childTopicIds: [], relatedTopicIds: ['rest-api'], lastStudied: '13 Ağu, 17:20', createdAt: '2026-08-03T16:00:00Z', updatedAt: '2026-08-13T17:20:00Z' },
  { id: 'computer-networks', title: 'Bilgisayar Ağları', notes: 'Ağ protokolleri, paketler ve internetin temel çalışma prensipleri.', noteCount: 11, parentTopicIds: [], childTopicIds: [], relatedTopicIds: ['linux-kernel', 'operating-systems'], lastStudied: '12 Ağu, 10:05', createdAt: '2026-08-01T09:15:00Z', updatedAt: '2026-08-12T10:05:00Z' },
  { id: 'user-experience', title: 'Kullanıcı Deneyimi', notes: 'Arayüz hiyerarşisi, etkileşim tasarımı ve kullanıcı araştırması.', noteCount: 5, parentTopicIds: [], childTopicIds: [], relatedTopicIds: ['web-development'], lastStudied: '10 Ağu, 15:45', createdAt: '2026-07-30T12:25:00Z', updatedAt: '2026-08-10T15:45:00Z' },
]

export const topicsStorageKey = 'wondr-topics'
export const topicOrderStorageKey = 'wondr-topic-order'
export const studyItemsStorageKey = 'wondr-study-items'
export const studyHistoryStorageKey = 'wondr-study-history'
export const highlightsStorageKey = 'wondr-highlights'
export const notesStorageKey = 'wondr-notes'
