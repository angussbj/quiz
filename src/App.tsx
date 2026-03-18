import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Layout } from './layout/Layout';

const HomePage = lazy(() => import('./routes/HomePage.tsx'));
const QuizPage = lazy(() => import('./routes/QuizPage.tsx'));

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Layout>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/quiz/*" element={<QuizPage />} />
            <Route path="/*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
