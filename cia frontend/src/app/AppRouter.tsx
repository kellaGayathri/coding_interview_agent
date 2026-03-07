import { Navigate, Route, Routes } from 'react-router-dom'
import { InterviewPage } from '../pages/InterviewPage'
import { InterviewSetupPage } from '../pages/InterviewSetupPage'
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/LoginPage'
import { PerformanceDashboardPage } from '../pages/PerformanceDashboardPage'
import { QuestionGeneratorPage } from '../pages/QuestionGeneratorPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ResultPage } from '../pages/ResultPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup" element={<InterviewSetupPage />} />
      <Route path="/interview" element={<InterviewPage />} />
      {/* result route accepts optional interviewId param so saved sessions can be opened */}
      <Route path="/result/:interviewId" element={<ResultPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/dashboard" element={<PerformanceDashboardPage />} />
      <Route path="/question-generator" element={<QuestionGeneratorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
