import { useContext } from 'react'
import { InterviewSessionContext } from '../context/interviewSessionStore'

export function useInterviewSession() {
  const context = useContext(InterviewSessionContext)

  if (!context) {
    throw new Error('useInterviewSession must be used within InterviewSessionProvider')
  }

  return context
}
