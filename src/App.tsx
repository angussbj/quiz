import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router';
import { Layout } from './layout/Layout';
import { QuizActiveProvider } from '@/quiz-modes/QuizActiveContext';
import { getQuizById } from '@/quiz-definitions/getQuizById';

const HomePage = lazy(() => import('./routes/HomePage.tsx'));
const QuizPage = lazy(() => import('./routes/QuizPage.tsx'));
const AboutPage = lazy(() => import('./routes/AboutPage.tsx'));
const ElementCostMethodology = lazy(() => import('./routes/ElementCostMethodology.tsx'));

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
      <QuizActiveProvider>
      <Layout>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/about/element-costs" element={<ElementCostMethodology />} />
            <Route path="/*" element={<QuizOrCategoryPage />} />
          </Routes>
        </Suspense>
      </Layout>
      </QuizActiveProvider>
    </BrowserRouter>
  );
}
