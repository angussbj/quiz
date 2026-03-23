import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router';
import { Layout } from './layout/Layout';
import { getQuizById } from '@/quiz-definitions/getQuizById';

const HomePage = lazy(() => import('./routes/HomePage.tsx'));
const QuizPage = lazy(() => import('./routes/QuizPage.tsx'));

function QuizOrCategoryPage() {
  const { '*': slug } = useParams();
  if (slug !== undefined && getQuizById(slug)) {
    return <QuizPage />;
  }
  return <HomePage />;
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Layout>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/*" element={<QuizOrCategoryPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
