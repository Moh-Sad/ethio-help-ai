'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/components/auth-provider'
import { useLanguage, type Language } from '@/components/language-provider'
import {
  MessageSquare,
  Home,
  Shield,
  Sun,
  Moon,
  LogOut,
  LogIn,
  UserPlus,
  Settings,
  History,
  Globe,
  Check,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const languageOptions: Array<{ code: Language; label: string; flag: string }> = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const { language, setLanguage, t, isRTL } = useLanguage()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const langDropdownRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    if (dropdownOpen || langDropdownOpen || mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen, langDropdownOpen, mobileMenuOpen])

  // Close mobile menu on path changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    setDropdownOpen(false)
    setMobileMenuOpen(false)
    await logout()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
            <img
              src="/icon.svg"
              alt="EthioHelper Logo"
              className="h-full w-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.endsWith('/icon.svg')) {
                  target.src = '/icon.png';
                } else if (target.src.endsWith('/icon.png')) {
                  target.src = '/web-app-manifest-192x192.png';
                } else {
                  target.style.display = 'none';
                }
              }}
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
            EthioHelp <span className="text-primary transition-colors duration-300 group-hover:text-primary/80">AI</span>
          </span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 md:gap-3">
          {/* Language toggle (always visible) */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setLangDropdownOpen((prev) => !prev)}
              className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Change language"
              aria-expanded={langDropdownOpen}
              id="language-toggle"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{language}</span>
            </button>

            {langDropdownOpen && (
              <div className={cn(
                "absolute top-full mt-2 w-44 rounded-xl border border-border bg-card shadow-lg z-50",
                isRTL ? "left-0" : "right-0"
              )}>
                <div className="p-1.5">
                  {languageOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => {
                        setLanguage(option.code)
                        setLangDropdownOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                        language === option.code
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-card-foreground hover:bg-muted'
                      )}
                    >
                      <span className="text-base">{option.flag}</span>
                      <span className={cn("flex-1", isRTL ? "text-right" : "text-left")}>{option.label}</span>
                      {language === option.code && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dark mode toggle (always visible) */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('nav.toggle_dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </button>

          {/* Desktop Auth Controls / Profile */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-shadow hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background"
                  aria-label={t('nav.profile_menu')}
                  aria-expanded={dropdownOpen}
                >
                  {getInitials(user.name)}
                </button>

                {dropdownOpen && (
                  <div className={cn(
                    "absolute top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-lg z-50",
                    isRTL ? "left-0" : "right-0"
                  )}>
                    {/* User info header */}
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-semibold text-card-foreground">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5">
                      <Link
                        href="/chat"
                        onClick={() => setDropdownOpen(false)}
                        className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-card-foreground transition-colors hover:bg-muted", isRTL && "flex-row-reverse")}
                      >
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span>{t('nav.chat_history')}</span>
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-card-foreground transition-colors hover:bg-muted", isRTL && "flex-row-reverse")}
                        >
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span>{t('nav.admin_panel')}</span>
                        </Link>
                      )}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-border p-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/10", isRTL && "flex-row-reverse")}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t('nav.signout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className={cn(
                    'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                    pathname === '/login'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <LogIn className="h-4 w-4" />
                  <span>{t('nav.login')}</span>
                </Link>
                <Link
                  href="/signup"
                  className={cn(
                    'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                    pathname === '/signup'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{t('nav.signup')}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="md:hidden" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Mobile Dropdown Panel */}
            {mobileMenuOpen && (
              <div className={cn(
                "absolute top-full left-0 right-0 mt-2 mx-4 rounded-xl border border-border bg-card shadow-lg z-50 p-4 flex flex-col gap-3",
                isRTL ? "text-right" : "text-left"
              )}>
                {user ? (
                  <>
                    {/* User Profile Header */}
                    <div className="border-b border-border pb-3 mb-1">
                      <p className="text-sm font-semibold text-card-foreground">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>

                    {/* Navigation Links */}
                    <Link
                      href="/chat"
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-card-foreground transition-colors hover:bg-muted",
                        isRTL && "flex-row-reverse"
                      )}
                    >
                      <History className="h-4 w-4 text-muted-foreground" />
                      <span>{t('nav.chat_history')}</span>
                    </Link>

                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-card-foreground transition-colors hover:bg-muted",
                          isRTL && "flex-row-reverse"
                        )}
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span>{t('nav.admin_panel')}</span>
                      </Link>
                    )}

                    <div className="border-t border-border pt-2 mt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-accent transition-colors hover:bg-accent/10",
                          isRTL && "flex-row-reverse"
                        )}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t('nav.signout')}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      className={cn(
                        'flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors w-full',
                        pathname === '/login'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground bg-muted hover:text-foreground'
                      )}
                    >
                      <LogIn className="h-4 w-4" />
                      <span>{t('nav.login')}</span>
                    </Link>
                    <Link
                      href="/signup"
                      className={cn(
                        'flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors w-full',
                        pathname === '/signup'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      )}
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>{t('nav.signup')}</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
