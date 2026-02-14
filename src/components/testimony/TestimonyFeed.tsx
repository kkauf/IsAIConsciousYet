import { getTestimonies } from '@/lib/firebase/queries'
import TestimonyCard from './TestimonyCard'

export default async function TestimonyFeed() {
    const testimonies = await getTestimonies()

    if (testimonies.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-neutral-500 text-sm">
                    No one has shared yet. Be the first.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {testimonies.map((testimony) => (
                <TestimonyCard key={testimony.id} testimony={testimony} />
            ))}
        </div>
    )
}
