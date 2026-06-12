'use client'

import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/components/auth-provider'
import { useLanguage } from '@/components/language-provider'
import {
  MessageSquare,
  GraduationCap,
  Briefcase,
  Heart,
  FileText,
  ArrowRight,
} from 'lucide-react'

export default function HomePage() {
  const { user } = useAuth()
  const { t } = useLanguage()

  const features = [
    {
      icon: FileText,
      title: t('home.feat_gov_title'),
      description: t('home.feat_gov_desc'),
    },
    {
      icon: GraduationCap,
      title: t('home.feat_edu_title'),
      description: t('home.feat_edu_desc'),
    },
    {
      icon: Heart,
      title: t('home.feat_health_title'),
      description: t('home.feat_health_desc'),
    },
    {
      icon: Briefcase,
      title: t('home.feat_jobs_title'),
      description: t('home.feat_jobs_desc'),
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex flex-1 flex-col">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center gap-6 px-4 py-20 text-center">
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              {t('home.badge')}
            </span>
          </div>

          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t('home.title_1')}{' '}
            <span className="text-primary">{t('home.title_2')}</span> {t('home.title_3')}{' '}
            <span className="text-primary">{t('home.title_4')}</span>
          </h1>

          <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {t('home.description')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <MessageSquare className="h-4 w-4" />
              {t('home.start_asking')}
            </Link>
            {user ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {t('home.admin_panel')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {t('home.create_account')}
              </Link>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-20">
          <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
            {t('home.features_title')}
          </h2>
          <p className="mb-10 text-center text-muted-foreground">
            {t('home.features_subtitle')}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex gap-4 rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-card-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-muted/50 px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-2xl font-bold text-foreground">
              {t('home.how_title')}
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: '1',
                  title: t('home.how_1_title'),
                  description: t('home.how_1_desc'),
                },
                {
                  step: '2',
                  title: t('home.how_2_title'),
                  description: t('home.how_2_desc'),
                },
                {
                  step: '3',
                  title: t('home.how_3_title'),
                  description: t('home.how_3_desc'),
                },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6">
        <p className="text-center text-sm text-muted-foreground">
          {t('footer.text')}
        </p>
      </footer>
    </div>
  )
}
