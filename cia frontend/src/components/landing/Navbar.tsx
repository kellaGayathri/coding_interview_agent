import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { LANDING_BRAND_NAME, LANDING_NAV_ITEMS } from '../../data/landingContent'

type NavbarProps = {
  loginPath?: string
}

export function Navbar({ loginPath = '/login' }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()
  const isLoggedIn = Boolean(user)

  const handleCloseMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSectionNavigation = useCallback(
    (sectionId: string) => {
      const section = document.getElementById(sectionId)
      if (!section) {
        return
      }
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      handleCloseMenu()
    },
    [handleCloseMenu],
  )

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="text-sm font-extrabold uppercase tracking-[0.18em] text-sky-300">
          {LANDING_BRAND_NAME}
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {LANDING_NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleSectionNavigation(item.sectionId)}
              className="text-sm font-semibold text-slate-300 transition hover:text-slate-100"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {!isLoggedIn ? (
          <div className="hidden md:block">
            <Link
              to={loginPath}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Login
            </Link>
          </div>
        ) : null}

        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation menu"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-200 transition hover:border-slate-500 md:hidden"
        >
          <span className="sr-only">Menu</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {isOpen ? (
        <nav
          id="mobile-nav"
          className="border-t border-slate-800 bg-slate-950 px-6 py-4 md:hidden"
          aria-label="Mobile primary"
        >
          <div className="flex flex-col gap-3">
            {LANDING_NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSectionNavigation(item.sectionId)}
                className="rounded-md px-1 py-2 text-left text-sm font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-slate-100"
              >
                {item.label}
              </button>
            ))}
            {!isLoggedIn ? (
              <Link
                to={loginPath}
                onClick={handleCloseMenu}
                className="mt-1 rounded-lg bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Login
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
