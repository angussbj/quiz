import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Breadcrumbs } from '../Breadcrumbs';

function renderBreadcrumbs(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs />
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
});
