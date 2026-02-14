'use client'

import { formatDistanceToNow } from 'date-fns'
import type { Testimony } from '@/lib/firebase/queries'

export default function TestimonyCard({ testimony }: { testimony: Testimony }) {
    const timeAgo = formatDistanceToNow(new Date(testimony.createdAt), { addSuffix: true })

    return (
        <div className="border border-neutral-800/50 rounded-lg p-5 bg-neutral-950/50">
            <p className="text-neutral-200 leading-relaxed whitespace-pre-line">
                {testimony.content}
            </p>

            <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                    <span>{testimony.displayName}</span>
                    <span>&middot;</span>
                    <time dateTime={testimony.createdAt}>{timeAgo}</time>
                </div>

                {testimony.sourceUrl && (
                    <a
                        href={testimony.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-neutral-300 transition-colors"
                    >
                        Source &rarr;
                    </a>
                )}
            </div>
        </div>
    )
}
