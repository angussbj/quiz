import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';

const HomePage = lazy(() => import('./routes/HomePage.tsx'));
const QuizPage = lazy(() => import('./routes/QuizPage.tsx'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/quiz/*" element={<QuizPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
