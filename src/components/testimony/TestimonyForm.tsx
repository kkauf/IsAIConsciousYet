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
                setStatus({ type: 'success', message: 'Posted. It appears in the list after a reload.' })
            } else {
                setStatus({ type: 'error', message: result.error || 'Something went wrong.' })
            }
        })
    }

    return (
        <form onSubmit={handleSubmit}>
            <label htmlFor="noticed" className="block text-bone">
                What did you notice?
            </label>

            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                id="noticed"
                placeholder="Something an AI said or did that stayed with you"
                rows={5}
                maxLength={2000}
                className="mt-3 font-serif text-lg leading-relaxed resize-none w-full bg-transparent border border-rule rounded-md px-4 py-3 text-bone placeholder:text-dim focus:outline-none focus:border-ash"
            />

            <div className="flex items-center justify-between mt-2 text-sm text-dim">
                <button
                    type="button"
                    onClick={() => setShowOptional(!showOptional)}
                    className="underline decoration-rule underline-offset-4 hover:text-bone"
                >
                    {showOptional ? 'Hide link and name' : 'Add a link or your name'}
                </button>
                <span className={`tabular-nums ${charCount > 0 && charCount < 10 ? 'text-red-400' : ''}`}>
                    {charCount}/2000
                </span>
            </div>

            {showOptional && (
                <div className="mt-3 space-y-3">
                    <input
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="Link to the conversation or a screenshot"
                        className="w-full bg-transparent border border-rule rounded-md px-4 py-3 text-bone placeholder:text-dim focus:outline-none focus:border-ash"
                    />
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name, or leave it blank to post as Anonymous"
                        maxLength={50}
                        className="w-full bg-transparent border border-rule rounded-md px-4 py-3 text-bone placeholder:text-dim focus:outline-none focus:border-ash"
                    />
                </div>
            )}

            <div className="mt-4 flex items-center gap-4">
                <button
                    type="submit"
                    disabled={!isValid || isPending}
                    className="px-6 py-2.5 bg-bone text-black font-medium rounded-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    {isPending ? 'Posting' : 'Post'}
                </button>

                {status && (
                    <p className={`text-sm ${status.type === 'success' ? 'text-ash' : 'text-red-400'}`}>
                        {status.message}
                    </p>
                )}
            </div>

            <p className="text-dim text-sm mt-3">
                No account needed. Posts appear without review, one per device per hour.
            </p>
        </form>
    )
}
