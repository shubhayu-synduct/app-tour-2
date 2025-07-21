import { NextRequest, NextResponse } from 'next/server'
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore'
import { getFirebaseFirestore } from '@/lib/firebase'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const { chatId, messages, userId, title } = await req.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages data' },
        { status: 400 }
      )
    }
    
    const db = getFirebaseFirestore()
    
    // If a chatId is provided, update the existing document
    if (chatId) {
      try {
        // First check if the document exists
        const chatDocRef = doc(db, "conversations", chatId)
        const docSnap = await getDoc(chatDocRef)
        
        if (docSnap.exists()) {
          // Update the existing document
          await updateDoc(chatDocRef, {
            title: title || messages[0]?.content?.substring(0, 100) || "New chat",
            updatedAt: Date.now(),
            messages
          })
          
          return NextResponse.json({ id: chatId })
        } else {
          // Document doesn't exist, so create a new one with the provided ID
          const newChatSession = {
            id: chatId,
            title: title || messages[0]?.content?.substring(0, 100) || "New chat",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            userId,
            messages
          }
          
          const docRef = await addDoc(collection(db, "conversations"), newChatSession)
          return NextResponse.json({ id: docRef.id })
        }
      } catch (error) {
        logger.error("Error saving chat session:", error);
        return NextResponse.json(
          { error: 'Failed to save chat session' },
          { status: 500 }
        )
      }
    } else {
      // Create a new document
      const newChatSession = {
        title: title || messages[0]?.content?.substring(0, 100) || "New chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId,
        messages
      }
      
      const docRef = await addDoc(collection(db, "conversations"), newChatSession)
      return NextResponse.json({ id: docRef.id })
    }
    
  } catch (error) {
    logger.error("Error in chat save API:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}