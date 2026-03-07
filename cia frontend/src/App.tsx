import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './app/AppRouter'
import { AuthProvider } from './context/authContext'
import { InterviewSessionProvider } from './context/InterviewSessionContext'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <InterviewSessionProvider>
          <AppRouter />
        </InterviewSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
