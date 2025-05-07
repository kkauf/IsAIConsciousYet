import './App.css'
import LandingPage from './pages/LandingPage.tsx'
import MainLayout from './layouts/MainLayout.tsx'

function App() {

  return (
    <>
      <MainLayout>
        <LandingPage />
      </MainLayout>
    </>
  )
}

export default App
