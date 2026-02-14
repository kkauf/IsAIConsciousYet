'use server'

import { adminDb } from '@/lib/firebase/server'

interface SubmitTestimonyInput {
    content: string
    sourceUrl?: string
    deviceId: string
    displayName?: string
}

export async function submitTestimony(input: SubmitTestimonyInput): Promise<{ success: boolean; error?: string }> {
    if (!adminDb) {
        return { success: false, error: 'Service temporarily unavailable.' }
    }

    const content = input.content?.trim()
    if (!content || content.length < 10) {
        return { success: false, error: 'Testimony must be at least 10 characters.' }
    }
    if (content.length > 2000) {
        return { success: false, error: 'Testimony must be under 2000 characters.' }
    }

    const deviceId = input.deviceId?.trim()
    if (!deviceId) {
        return { success: false, error: 'Device identifier is required.' }
    }

    // Validate optional URL
    let sourceUrl: string | null = null
    if (input.sourceUrl?.trim()) {
        try {
            new URL(input.sourceUrl.trim())
            sourceUrl = input.sourceUrl.trim()
        } catch {
            return { success: false, error: 'Please enter a valid URL.' }
        }
    }

    // Rate limit: 1 per device per hour
    // Single-field where avoids composite index requirement; check time in code
    try {
        const recentSubmissions = await adminDb
            .collection('testimonies')
            .where('deviceId', '==', deviceId)
            .limit(5)
            .get()

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        const hasRecent = recentSubmissions.docs.some(
            (doc) => doc.data().createdAt > oneHourAgo
        )
        if (hasRecent) {
            return { success: false, error: 'You can submit one testimony per hour. Please try again later.' }
        }
    } catch (error) {
        console.error('Rate limit check failed:', error)
        // Continue — don't block submission if rate limit check fails
    }

    const displayName = input.displayName?.trim() || 'Anonymous'

    try {
        await adminDb.collection('testimonies').add({
            content,
            sourceUrl,
            deviceId,
            displayName,
            createdAt: new Date().toISOString(),
            status: 'published',
        })

        return { success: true }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error('Failed to save testimony:', msg)
        return { success: false, error: `Failed to save: ${msg}` }
    }
}
