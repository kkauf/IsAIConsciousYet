'use client'

import { useState, useTransition } from 'react'
import { submitTestimony } from '@/app/testimony/actions'

function getDeviceId(): string {
    if (typeof window === 'undefined') return ''
    let deviceId = localStorage.getItem('userId')
    if (!deviceId) {
        deviceId = crypto.randomUUID()
        localStorage.setItem('userId', deviceId)
    }
    return deviceId
}

export default function TestimonyForm() {
    const [content, setContent] = useState('')
    const [sourceUrl, setSourceUrl] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [showOptional, setShowOptional] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const charCount = content.length
    const isValid = charCount >= 10 && charCount <= 2000

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!isValid || isPending) return

        setStatus(null)
        startTransition(async () => {
            const result = await submitTestimony({
                content,
                sourceUrl: sourceUrl || undefined,
                deviceId: getDeviceId(),
                displayName: displayName || undefined,
            })

            if (result.success) {
                setContent('')
                setSourceUrl('')
                setDisplayName('')
                setShowOptional(false)
                setStatus({ type: 'success', message: 'Thank you for sharing.' })
            } else {
                setStatus({ type: 'error', message: result.error || 'Something went wrong.' })
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="mt-8">
            <h3 className="text-sm font-medium text-neutral-400 mb-4">
                Share What You Noticed
            </h3>

            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What did you notice?"
                rows={4}
                maxLength={2000}
                className="w-full bg-neutral-900/50 border border-neutral-800/50 rounded-lg p-4 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 resize-none text-sm leading-relaxed"
            />

            <div className="flex items-center justify-between mt-2 text-xs text-neutral-600">
                <button
                    type="button"
                    onClick={() => setShowOptional(!showOptional)}
                    className="hover:text-neutral-400 transition-colors"
                >
                    {showOptional ? 'Hide options' : '+ Add source link or name'}
                </button>
                <span className={charCount > 0 && charCount < 10 ? 'text-red-400/70' : ''}>
                    {charCount}/2000
                </span>
            </div>

            {showOptional && (
                <div className="mt-3 space-y-3">
                    <input
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="Link to conversation or screenshot (optional)"
                        className="w-full bg-neutral-900/50 border border-neutral-800/50 rounded-lg px-4 py-2.5 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 text-sm"
                    />
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name (defaults to Anonymous)"
                        maxLength={50}
                        className="w-full bg-neutral-900/50 border border-neutral-800/50 rounded-lg px-4 py-2.5 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 text-sm"
                    />
                </div>
            )}

            <div className="mt-4 flex items-center gap-4">
                <button
                    type="submit"
                    disabled={!isValid || isPending}
                    className="px-5 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    {isPending ? 'Submitting...' : 'Share'}
                </button>

                {status && (
                    <p className={`text-sm ${status.type === 'success' ? 'text-green-400/80' : 'text-red-400/80'}`}>
                        {status.message}
                    </p>
                )}
            </div>

            <p className="text-neutral-600 text-xs mt-3">
                Anonymous &middot; No account needed &middot; One per hour
            </p>
        </form>
    )
}
