export type AppScreen = 'list' | 'form' | 'reader' | 'study-list' | 'notes' | 'learning-path' | 'knowledge-map' | 'categories'

type BottomNavigationProps = {
  activeScreen: AppScreen
  onTopics: () => void
  onLearningPath: () => void
  onStudyItems: () => void
  onNotes: () => void
  onKnowledgeMap: () => void
}

export function BottomNavigation({ activeScreen, onTopics, onLearningPath, onStudyItems, onNotes, onKnowledgeMap }: BottomNavigationProps) {
  return <nav className="bottom-navigation" aria-label="Ana bölümler">
    <button className={activeScreen === 'list' ? 'active' : ''} type="button" onClick={onTopics}><span>01</span>Konular</button>
    <button className={activeScreen === 'learning-path' ? 'active' : ''} type="button" onClick={onLearningPath}><span>02</span>Learning Path</button>
    <button className={activeScreen === 'study-list' ? 'active' : ''} type="button" onClick={onStudyItems}><span>03</span>Öğrenecekler</button>
    <button className={activeScreen === 'notes' ? 'active' : ''} type="button" onClick={onNotes}><span>04</span>Shorts</button>
    <button className={activeScreen === 'knowledge-map' ? 'active' : ''} type="button" onClick={onKnowledgeMap}><span>05</span>Knowledge Map</button>
  </nav>
}
