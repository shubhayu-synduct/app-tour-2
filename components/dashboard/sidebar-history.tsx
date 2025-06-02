"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import Link from "next/link"
import { format, isToday, isYesterday } from 'date-fns'
import React from "react"

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
}

export function SidebarHistory() {
  const { user } = useAuth()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setChatSessions([])
      setLoading(false)
      return
    }
    const fetchChatSessions = async () => {
      setLoading(true)
      try {
        const db = getFirebaseFirestore()
        const chatSessionQuery = query(
          collection(db, "conversations"),
          where("userId", "==", user.uid),
          orderBy("updatedAt", "desc")
        )
        const querySnapshot = await getDocs(chatSessionQuery)
        const sessions: ChatSession[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data() as ChatSession & { messages?: any[] }
          let displayTitle = data.title || "New chat"
          if (data.messages && data.messages.length > 0) {
            const mainQuestion = data.messages.find(msg => 
              msg.type === 'user' && msg.questionType === 'main'
            )
            if (mainQuestion) {
              displayTitle = mainQuestion.content
            } else {
              const firstUserMessage = data.messages.find(msg => msg.type === 'user')
              if (firstUserMessage) {
                displayTitle = firstUserMessage.content
              }
            }
            if (displayTitle.length > 40) {
              displayTitle = displayTitle.substring(0, 37) + '...'
            }
          }
          sessions.push({
            id: doc.id,
            title: displayTitle,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            userId: data.userId
          })
        })
        setChatSessions(sessions)
      } catch (err) {
        setChatSessions([])
      } finally {
        setLoading(false)
      }
    }
    fetchChatSessions()
  }, [user])

  // Group sessions by Today, Yesterday, or date
  const groups: Record<string, ChatSession[]> = {}
  chatSessions.forEach(session => {
    const date = new Date(session.updatedAt)
    let groupLabel = format(date, 'MMMM d, yyyy')
    if (isToday(date)) groupLabel = 'Today'
    else if (isYesterday(date)) groupLabel = 'Yesterday'
    if (!groups[groupLabel]) groups[groupLabel] = []
    groups[groupLabel].push(session)
  })

  return (
    <div className="px-2 pb-2 overflow-y-auto scrollbar-hide">
      {loading ? (
        <div className="text-xs text-gray-400 py-4 text-center">Loading...</div>
      ) : chatSessions.length === 0 ? (
        <div className="text-xs text-gray-400 py-4 text-center">No history</div>
      ) : (
        Object.entries(groups).map(([label, sessions]) => (
          <div key={label} className="mb-2">
            <div className="text-xs font-semibold text-[#7A8CA3] mb-1 px-1">{label}</div>
            <div className="flex flex-col gap-1">
              {sessions.map((session, idx) => (
                <React.Fragment key={session.id}>
                  <Link
                    href={`/dashboard/${session.id}`}
                    className="block px-2 py-1 rounded-md text-sm text-[#223258] hover:bg-blue-50 truncate"
                    title={session.title}
                  >
                    {session.title}
                  </Link>
                  {/* Gradient line, except after the last item */}
                  {idx !== sessions.length - 1 && (
                    <div className="h-px w-full bg-gradient-to-r from-[#9599AB] to-white my-1" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// Add this to your sidebar and ensure you have a scrollbar-hide utility or add custom CSS for it. 