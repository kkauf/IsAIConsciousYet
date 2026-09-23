'use client'

import { formatDistanceToNow } from 'date-fns'
import type { Testimony } from '@/lib/firebase/queries'

export default function TestimonyCard({ testimony }: { testimony: Testimony }) {
    const timeAgo = formatDistanceToNow(new Date(testimony.createdAt), { addSuffix: true })

    return (
        <figure className="py-7">
            <blockquote className="font-serif text-xl leading-relaxed text-bone/90 whitespace-pre-line">
                {testimony.content}
            </blockquote>
            <figcaption className="mt-3 text-sm text-dim">
                {testimony.displayName}, <time dateTime={testimony.createdAt}>{timeAgo}</time>
                {testimony.sourceUrl && (
                    <>
                        ,{' '}
                        <a href={testimony.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-rule underline-offset-4 hover:text-bone">
                            source
                        </a>
                    </>
                )}
            </figcaption>
        </figure>
    )
}
