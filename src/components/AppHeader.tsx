import type { ChangeEvent } from 'react'

type AppHeaderProps = {
  canLogOut: boolean
  onHome: () => void
  onExport: () => void
  onImport: (event: ChangeEvent<HTMLInputElement>) => void
  onLogOut: () => void
}

export function AppHeader({ canLogOut, onHome, onExport, onImport, onLogOut }: AppHeaderProps) {
  function goHome(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    onHome()
  }

  return <header className="topbar">
    <a className="brand" href="#topics" aria-label="wondR ana sayfa" onClick={goHome}>wond<span>R</span></a>
    <p className="manifesto">I WONDER HOW THIS WORKS.</p>
    <div className="backup-actions">
      <button type="button" onClick={onExport}>Dışa aktar</button>
      <label>İçe aktar<input type="file" accept="application/json,.json" onChange={onImport}/></label>
      {canLogOut && <button type="button" onClick={onLogOut}>Çıkış</button>}
    </div>
  </header>
}
