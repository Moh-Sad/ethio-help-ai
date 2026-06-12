'use client'

import React, { useState, useCallback, useRef } from 'react'
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
  File,
  Trash2,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface DocumentsData {
  titles: string[]
  totalChunks: number
}

const CATEGORIES = [
  { id: 'general', name: 'General' },
  { id: 'government', name: 'Government Services' },
  { id: 'education', name: 'Education' },
  { id: 'health', name: 'Health' },
  { id: 'business', name: 'Jobs & Business' },
]

export default function AdminPage() {
  const { user, token, isLoading: authLoading } = useAuth()
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileBase64, setFileBase64] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const { data: docs } = useSWR<DocumentsData>(
    user ? `${API_URL}/documents` : null,
    fetcher
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null)
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const allowedExtensions = ['.pdf', '.docx', '.pptx', '.doc', '.ppt']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!allowedExtensions.includes(fileExtension)) {
      setResult({
        type: 'error',
        message: `Invalid file type. Only ${allowedExtensions.join(', ')} files are allowed.`,
      })
      setSelectedFile(null)
      setFileBase64(null)
      return
    }

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setResult({
        type: 'error',
        message: 'File size exceeds the 10MB limit.',
      })
      setSelectedFile(null)
      setFileBase64(null)
      return
    }

    setSelectedFile(file)

    // Convert file to base64
    const reader = new FileReader()
    reader.onload = () => {
      setFileBase64(reader.result as string)
    }
    reader.onerror = () => {
      setResult({ type: 'error', message: 'Failed to read file.' })
    }
    reader.readAsDataURL(file)
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
    setFileBase64(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setUploading(true)
      setResult(null)

      try {
        const payload: Record<string, any> = { category }

        if (uploadMode === 'file') {
          if (!selectedFile || !fileBase64) {
            setResult({ type: 'error', message: 'Please select a file to upload.' })
            setUploading(false)
            return
          }
          payload.file = fileBase64
          payload.fileName = selectedFile.name
          payload.title = title.trim() || undefined // Title is optional for file uploads, defaults to filename
        } else {
          if (!title.trim() || !content.trim()) {
            setResult({ type: 'error', message: 'Title and content are required.' })
            setUploading(false)
            return
          }
          payload.title = title.trim()
          payload.content = content.trim()
        }

        const res = await fetch(`${API_URL}/documents/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
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
        
        // Reset inputs
        setTitle('')
        setContent('')
        setSelectedFile(null)
        setFileBase64(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        mutate(`${API_URL}/documents`)
      } catch {
        setResult({ type: 'error', message: 'Network error. Please try again.' })
      } finally {
        setUploading(false)
      }
    },
    [uploadMode, title, content, category, selectedFile, fileBase64, token]
  )

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

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

  // Not an admin
  if (user.role !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Lock className="h-6 w-6 text-accent" />
              </div>
              <h1 className="text-xl font-bold text-card-foreground">Restricted Access</h1>
              <p className="text-center text-sm text-muted-foreground">
                The admin panel is restricted to administrators only. You are logged in as <span className="font-medium text-foreground">{user.name}</span>.
              </p>
            </div>
            <Link
              href="/chat"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to Chat
            </Link>
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
            Upload files or paste text documents to build the AI knowledge base for Ethiopian services.
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
            <ul className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
              {docs.titles.map((docTitle) => (
                <li
                  key={docTitle}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="max-w-[200px] truncate">{docTitle}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload form container */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Mode Tabs */}
          <div className="flex border-b border-border bg-muted/30">
            <button
              type="button"
              onClick={() => {
                setUploadMode('file')
                setResult(null)
              }}
              className={cn(
                'flex-1 py-3.5 text-sm font-medium border-b-2 transition-colors',
                uploadMode === 'file'
                  ? 'border-primary text-primary bg-card'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Upload Document File
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('text')
                setResult(null)
              }}
              className={cn(
                'flex-1 py-3.5 text-sm font-medium border-b-2 transition-colors',
                uploadMode === 'text'
                  ? 'border-primary text-primary bg-card'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Paste Text Manually
            </button>
          </div>

          <form onSubmit={handleUpload} className="p-6">
            <h2 className="mb-4 text-base font-semibold text-card-foreground">
              {uploadMode === 'file' ? 'Extract & Index from Document' : 'Index Custom Text Document'}
            </h2>

            {/* Document Category (Shared) */}
            <div className="mb-4">
              <label
                htmlFor="doc-category"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Document Category
              </label>
              <select
                id="doc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={uploading}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Title (Shared, optional for file mode) */}
            <div className="mb-4">
              <label
                htmlFor="doc-title"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Document Title {uploadMode === 'file' && <span className="text-xs text-muted-foreground">(Optional, falls back to file name)</span>}
              </label>
              <input
                id="doc-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={uploadMode === 'file' ? "e.g. Passport Application Instructions" : "Title of the document..."}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required={uploadMode === 'text'}
                disabled={uploading}
              />
            </div>

            {/* File Upload Mode Input */}
            {uploadMode === 'file' ? (
              <div className="mb-6">
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                  Select Document File
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.pptx,.doc,.ppt"
                  className="hidden"
                  disabled={uploading}
                />

                {!selectedFile ? (
                  <div
                    onClick={triggerFileSelect}
                    className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 bg-background hover:bg-primary/5 rounded-xl p-8 cursor-pointer transition-colors"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-card-foreground">Click to upload file</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, Word (DOC/DOCX), or PowerPoint (PPT/PPTX)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Maximum size: 10MB</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border border-border bg-background rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <File className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-start">
                        <p className="text-sm font-medium text-card-foreground max-w-[300px] truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Remove file"
                      disabled={uploading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Text Paste Mode Input */
              <div className="mb-6">
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
                  rows={10}
                  className="w-full resize-y rounded-lg border border-input bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required={uploadMode === 'text'}
                  disabled={uploading}
                />
              </div>
            )}

            {/* Result message */}
            {result && (
              <div
                className={cn(
                  "mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm",
                  result.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                )}
              >
                {result.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{result.message}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                uploading || 
                (uploadMode === 'file' && !selectedFile) || 
                (uploadMode === 'text' && (!title.trim() || !content.trim()))
              }
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Document...
                </>
              ) : (
                <>
                  {uploadMode === 'file' ? <File className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {uploadMode === 'file' ? 'Upload & Extract Document' : 'Index Custom Text'}
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
