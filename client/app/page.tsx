'use client'

import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/components/auth-provider'
import {
  MessageSquare,
  GraduationCap,
  Briefcase,
  Heart,
  FileText,
  ArrowRight,
} from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Government Services',
    description: 'Get help with passports, IDs, licenses, and other official documents.',
  },
  {
    icon: GraduationCap,
    title: 'Education',
    description: 'Learn about university applications, scholarships, and enrollment.',
  },
  {
    icon: Heart,
    title: 'Health',
    description: 'Find information on healthcare services and medical procedures.',
  },
  {
    icon: Briefcase,
    title: 'Jobs & Business',
    description: 'Discover how to start a business, register, or find employment.',
  },
]

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex flex-1 flex-col">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center gap-6 px-4 py-20 text-center">
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              AI-Powered Information Assistant
            </span>
          </div>

          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your Guide to Ethiopian{' '}
            <span className="text-primary">Services</span> &{' '}
            <span className="text-primary">Processes</span>
          </h1>

          <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            EthioHelp AI helps the Ethiopian community get accurate, step-by-step
            information about government services, education, health, jobs, and
            business processes - all powered by AI.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <MessageSquare className="h-4 w-4" />
              Start Asking
            </Link>
            {user ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Admin Panel
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Create Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-20">
          <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
            What can EthioHelp AI help you with?
          </h2>
          <p className="mb-10 text-center text-muted-foreground">
            Ask questions about any of these topics and get accurate, sourced answers.
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
              How It Works
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: '1',
                  title: 'Upload Knowledge',
                  description:
                    'Admins upload documents about Ethiopian services and processes to build the knowledge base.',
                },
                {
                  step: '2',
                  title: 'Ask a Question',
                  description:
                    'Users type their question in the chat. The AI searches the knowledge base for relevant information.',
                },
                {
                  step: '3',
                  title: 'Get Accurate Answers',
                  description:
                    'The AI provides sourced, step-by-step answers based only on verified documents.',
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
          EthioHelp AI - Helping the Ethiopian community with accurate information.
        </p>
      </footer>
    </div>
  )
}
