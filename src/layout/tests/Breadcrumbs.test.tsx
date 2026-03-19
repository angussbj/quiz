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
    renderBreadcrumbs('/geo-capitals-europe');
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Geography')).toBeInTheDocument();
    expect(screen.getByText('Capitals')).toBeInTheDocument();
    expect(screen.getByText('European Capitals')).toBeInTheDocument();
  });

  it('makes intermediate segments clickable links', () => {
    renderBreadcrumbs('/geo-capitals-europe');
    const homeLink = screen.getByText('Home');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');

    const geographyLink = screen.getByText('Geography');
    expect(geographyLink.closest('a')).toHaveAttribute('href', '/geography');

    const capitalsLink = screen.getByText('Capitals');
    expect(capitalsLink.closest('a')).toHaveAttribute('href', '/geography/capitals');
  });

  it('marks the last segment as current page', () => {
    renderBreadcrumbs('/geo-capitals-europe');
    const current = screen.getByText('European Capitals');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('renders category breadcrumbs', () => {
    renderBreadcrumbs('/geography/capitals');
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Geography')).toBeInTheDocument();
    expect(screen.getByText('Capitals')).toBeInTheDocument();
  });

  it('renders category breadcrumbs for unknown single-segment paths', () => {
    renderBreadcrumbs('/nonexistent');
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Nonexistent')).toBeInTheDocument();
  });

  it('capitalizes category URL segments', () => {
    renderBreadcrumbs('/geography');
    expect(screen.getByText('Geography')).toBeInTheDocument();
  });
});
