'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useLanguage } from '@/components/language-provider'
import { CheckCircle2, XCircle, Loader2, LogIn } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const { t, isRTL } = useLanguage()
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState(t('verify.title_verifying'))

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage(t('verify.no_token'))
      return
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        const data = await res.json()

        if (res.ok) {
          setStatus('success')
          setMessage(t('verify.success_desc'))
        } else {
          setStatus('error')
          setMessage(data.error || t('verify.failed'))
        }
      } catch (error) {
        setStatus('error')
        setMessage(t('verify.network_error'))
      }
    }

    verifyToken()
  }, [token, t])

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm" dir={isRTL ? 'rtl' : 'ltr'}>
      {status === 'loading' && (
        <>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">{t('verify.verifying')}</h2>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">{t('verify.verified')}</h2>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">{t('verify.failed')}</h2>
        </>
      )}

      <p className="mb-8 text-sm text-muted-foreground">{message}</p>

      {status !== 'loading' && (
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <LogIn className="h-4 w-4" />
          {t('verify.go_to_login')}
        </Link>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  const { t } = useLanguage()

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Suspense fallback={
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">{t('verify.loading')}</h2>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </main>
    </div>
  )
}
