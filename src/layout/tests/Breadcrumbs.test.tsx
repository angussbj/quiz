import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Breadcrumbs } from '../Breadcrumbs';
import { QuizActiveContext } from '@/quiz-modes/QuizActiveContext';

function renderBreadcrumbs(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs />
    </MemoryRouter>,
  );
}

function renderBreadcrumbsWithQuizActive(path: string, onReconfigure: () => void) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QuizActiveContext.Provider value={{ isActive: true, onReconfigure }}>
        <Breadcrumbs />
      </QuizActiveContext.Provider>
    </MemoryRouter>,
  );
}

describe('Breadcrumbs', () => {
  it('renders nothing on the home page', () => {
    const { container } = renderBreadcrumbs('/');
    expect(container.querySelector('nav')).toBeNull();
  });

  it('renders quiz breadcrumbs with path segments', () => {
    renderBreadcrumbs('/geo-capitals-world');
    expect(screen.getByText('Geography')).toBeInTheDocument();
    expect(screen.getByText('World Capitals')).toBeInTheDocument();
  });

  it('makes intermediate segments clickable links', () => {
    renderBreadcrumbs('/geo-capitals-world');
    const geographyLink = screen.getByText('Geography');
    expect(geographyLink.closest('a')).toHaveAttribute('href', '/geography');
  });

  it('marks the last segment as current page', () => {
    renderBreadcrumbs('/geo-capitals-world');
    const current = screen.getByText('World Capitals');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('renders category breadcrumbs', () => {
    renderBreadcrumbs('/geography');
    expect(screen.getByText('Geography')).toBeInTheDocument();
  });

  it('renders category breadcrumbs for unknown single-segment paths', () => {
    renderBreadcrumbs('/nonexistent');
    expect(screen.getByText('Nonexistent')).toBeInTheDocument();
  });

  it('capitalizes category URL segments', () => {
    renderBreadcrumbs('/geography');
    expect(screen.getByText('Geography')).toBeInTheDocument();
  });

  it('makes the last segment a clickable button when quiz is active', () => {
    const onReconfigure = jest.fn();
    renderBreadcrumbsWithQuizActive('/geo-capitals-world', onReconfigure);
    const lastSegment = screen.getByText('World Capitals');
    expect(lastSegment.tagName).toBe('BUTTON');
    expect(lastSegment).not.toHaveAttribute('aria-current');
  });

  it('calls onReconfigure when clicking the last breadcrumb while quiz is active', async () => {
    const user = userEvent.setup();
    const onReconfigure = jest.fn();
    renderBreadcrumbsWithQuizActive('/geo-capitals-world', onReconfigure);
    await user.click(screen.getByText('World Capitals'));
    expect(onReconfigure).toHaveBeenCalledTimes(1);
  });

  it('keeps the last segment as static text when quiz is not active', () => {
    renderBreadcrumbs('/geo-capitals-world');
    const lastSegment = screen.getByText('World Capitals');
    expect(lastSegment.tagName).toBe('SPAN');
    expect(lastSegment).toHaveAttribute('aria-current', 'page');
  });
});
