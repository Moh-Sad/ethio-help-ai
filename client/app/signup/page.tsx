'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { Navbar } from '@/components/navbar'
import { useLanguage } from '@/components/language-provider'
import { User, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const { t, isRTL } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('signup.password_mismatch'))
      return
    }

    setLoading(true)
    const result = await signup(name, email, password)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.requiresVerification) {
      setIsSuccess(true)
      setLoading(false)
    } else {
      router.push('/chat')
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-4">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <div className="relative top-2 mx-auto mb-5 flex h-28 w-28 items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105">
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
            <h1 className="text-2xl font-bold text-foreground">{t('signup.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('signup.subtitle')}
            </p>
          </div>

          {isSuccess ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">{t('signup.success_title')}</h2>
              <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
                {t('signup.success_desc')}{' '}
                <span className="font-medium text-foreground">{email}</span>.
              </p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t('signup.go_to_login')}
              </Link>
            </div>
          ) : (
            <>
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-border bg-card p-6"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {error && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="mb-4">
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-sm font-medium text-card-foreground text-start"
                  >
                    {t('signup.full_name')}
                  </label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('signup.full_name_placeholder')}
                      required
                      disabled={loading}
                      className={`w-full rounded-lg border border-input bg-background py-2.5 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50`}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-card-foreground text-start"
                  >
                    {t('signup.email')}
                  </label>
                  <div className="relative">
                    <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('signup.email_placeholder')}
                      required
                      disabled={loading}
                      className={`w-full rounded-lg border border-input bg-background py-2.5 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50`}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-card-foreground text-start"
                  >
                    {t('signup.password')}
                  </label>
                  <div className="relative">
                    <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('signup.password_placeholder')}
                      required
                      minLength={6}
                      disabled={loading}
                      className={`w-full rounded-lg border border-input bg-background py-2.5 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50`}
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-sm font-medium text-card-foreground text-start"
                  >
                    {t('signup.confirm_password')}
                  </label>
                  <div className="relative">
                    <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('signup.confirm_password_placeholder')}
                      required
                      minLength={6}
                      disabled={loading}
                      className={`w-full rounded-lg border border-input bg-background py-2.5 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !name.trim() || !email.trim() || !password || !confirmPassword}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('signup.submitting')}
                    </>
                  ) : (
                    t('signup.submit')
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {t('signup.have_account')}{' '}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  {t('signup.login_link')}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
