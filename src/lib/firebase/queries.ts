import { adminDb } from '@/lib/firebase/server'

export interface Testimony {
    id: string
    content: string
    sourceUrl: string | null
    displayName: string
    createdAt: string
    status: string
}

export async function getTestimonies(): Promise<Testimony[]> {
    if (!adminDb) return []

    try {
        // Single-field orderBy avoids needing a composite index
        const snapshot = await adminDb
            .collection('testimonies')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get()

        return snapshot.docs
            .map((doc) => ({
                id: doc.id,
                content: doc.data().content,
                sourceUrl: doc.data().sourceUrl || null,
                displayName: doc.data().displayName || 'Anonymous',
                createdAt: doc.data().createdAt,
                status: doc.data().status,
            }))
            .filter((t) => t.status === 'published')
            .slice(0, 50)
    } catch (error) {
        console.error('Error fetching testimonies:', error)
        return []
    }
}

export async function getNews() {
    if (!adminDb) return []

    try {
        const snapshot = await adminDb
            .collection('news')
            .orderBy('publishedAt', 'desc')
            .limit(20)
            .get()

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))
    } catch (error) {
        console.error('Error fetching news:', error)
        return []
    }
}

export async function getEvidence() {
    if (!adminDb) return []

    try {
        const snapshot = await adminDb
            .collection('evidence')
            // .where('status', '==', 'approved') // Uncomment when moderation is ready
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get()

        const evidence = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = doc.data()
                let author = { displayName: 'Anonymous', photoURL: null }

                if (data.userId) {
                    try {
                        const userDoc = await adminDb!.collection('users').doc(data.userId).get()
                        if (userDoc.exists) {
                            const userData = userDoc.data()
                            author = {
                                displayName: userData?.displayName || 'Anonymous',
                                photoURL: userData?.photoURL || null,
                            }
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch author for evidence ${doc.id}`)
                    }
                }

                return {
                    id: doc.id,
                    ...data,
                    author,
                }
            })
        )

        return evidence
    } catch (error) {
        console.error('Error fetching evidence:', error)
        return []
    }
}
