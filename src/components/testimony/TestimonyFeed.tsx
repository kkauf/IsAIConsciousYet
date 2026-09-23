import { getTestimonies } from '@/lib/firebase/queries'
import TestimonyCard from './TestimonyCard'

export default async function TestimonyFeed({ limit }: { limit?: number }) {
    const testimonies = (await getTestimonies()).slice(0, limit)

    if (testimonies.length === 0) {
        return <p className="py-7 text-ash">Nobody has written anything yet.</p>
    }

    return (
        <div className="divide-y divide-rule">
            {testimonies.map((testimony) => (
                <TestimonyCard key={testimony.id} testimony={testimony} />
            ))}
        </div>
    )
}
