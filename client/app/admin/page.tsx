'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/components/auth-provider'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  LogIn,
  Database,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface DocumentsData {
  titles: string[]
  totalChunks: number
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const { data: docs } = useSWR<DocumentsData>(
    user ? '/api/admin/documents' : null,
    fetcher
  )

  const handleUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setUploading(true)
      setResult(null)

      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        })

        const data = await res.json()

        if (!res.ok) {
          setResult({ type: 'error', message: data.error || 'Upload failed.' })
          return
        }

        setResult({
          type: 'success',
          message: `${data.message} (${data.chunksCreated} chunks created)`,
        })
        setTitle('')
        setContent('')
        mutate('/api/admin/documents')
      } catch {
        setResult({ type: 'error', message: 'Network error. Please try again.' })
      } finally {
        setUploading(false)
      }
    },
    [title, content]
  )

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-card-foreground">Admin Access</h1>
              <p className="text-center text-sm text-muted-foreground">
                Login to your account to manage the knowledge base.
              </p>
            </div>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Knowledge Base Manager
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload documents to build the AI knowledge base for Ethiopian services.
            Logged in as{' '}
            <span className="font-medium text-foreground">{user.name}</span>.
          </p>
        </div>

        {/* Stats */}
        {docs && (
          <div className="mb-6 flex gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {docs.titles.length}
                </p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {docs.totalChunks}
                </p>
                <p className="text-xs text-muted-foreground">Chunks</p>
              </div>
            </div>
          </div>
        )}

        {/* Existing documents */}
        {docs && docs.titles.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-card-foreground">
              Uploaded Documents
            </h2>
            <ul className="flex flex-col gap-2">
              {docs.titles.map((docTitle) => (
                <li
                  key={docTitle}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  {docTitle}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload form */}
        <form
          onSubmit={handleUpload}
          className="rounded-xl border border-border bg-card p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">
            Upload New Document
          </h2>

          <div className="mb-4">
            <label
              htmlFor="doc-title"
              className="mb-1.5 block text-sm font-medium text-card-foreground"
            >
              Document Title
            </label>
            <input
              id="doc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Passport Application Guide"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={uploading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="doc-content"
              className="mb-1.5 block text-sm font-medium text-card-foreground"
            >
              Document Content
            </label>
            <textarea
              id="doc-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the full document text here..."
              rows={12}
              className="w-full resize-y rounded-lg border border-input bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={uploading}
            />
          </div>

          {/* Result message */}
          {result && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                result.type === 'success'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {result.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !title.trim() || !content.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload & Index Document
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
