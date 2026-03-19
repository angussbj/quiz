import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { NavigationTree } from '../NavigationTree';
import type { NavigationNode } from '../NavigationNode';

const tree: NavigationNode = {
  label: 'Quizzes',
  children: [
    {
      label: 'Geography',
      children: [
        { label: 'Capitals', children: [], quizId: 'caps' },
        { label: 'Flags', children: [], quizId: 'flags' },
      ],
    },
    {
      label: 'Science',
      children: [
        { label: 'Elements', children: [], quizId: 'elements' },
      ],
    },
  ],
};

function renderTree(
  expandedPaths: ReadonlySet<string> = new Set(['Geography', 'Science']),
  onTogglePath: (path: string) => void = () => {},
  searchQuery?: string,
) {
  return render(
    <MemoryRouter>
      <NavigationTree
        root={tree}
        expandedPaths={expandedPaths}
        onTogglePath={onTogglePath}
        searchQuery={searchQuery}
      />
    </MemoryRouter>,
  );
}

describe('NavigationTree', () => {
  it('renders category buttons', () => {
    renderTree();
    expect(screen.getByRole('button', { name: /Geography/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Science/ })).toBeInTheDocument();
  });

  it('renders quiz links when expanded', () => {
    renderTree(new Set(['Geography', 'Science']));
    expect(screen.getByRole('link', { name: 'Capitals' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Flags' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Elements' })).toBeInTheDocument();
  });

  it('does not render children when collapsed', () => {
    renderTree(new Set());
    expect(screen.queryByRole('link', { name: 'Capitals' })).not.toBeInTheDocument();
  });

  it('calls onTogglePath when a category is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    renderTree(new Set(['Geography']), onToggle);

    await user.click(screen.getByRole('button', { name: /Geography/ }));
    expect(onToggle).toHaveBeenCalledWith('Geography');
  });

  it('renders quiz links with correct href', () => {
    renderTree(new Set(['Geography']));
    const link = screen.getByRole('link', { name: 'Capitals' });
    expect(link).toHaveAttribute('href', '/caps');
  });

  it('has accessible navigation landmark', () => {
    renderTree();
    expect(screen.getByRole('navigation', { name: 'Quiz navigation' })).toBeInTheDocument();
  });

  it('sets aria-expanded on category buttons', () => {
    renderTree(new Set(['Geography']));
    expect(screen.getByRole('button', { name: /Geography/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Science/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});

describe('HighlightedLabel', () => {
  it('wraps matching text in mark elements when searchQuery is provided', () => {
    renderTree(new Set(['Geography']), () => {}, 'cap');
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].textContent).toBe('Cap');
  });

  it('does not highlight when query is under 3 characters', () => {
    renderTree(new Set(['Geography']), () => {}, 'ca');
    const marks = document.querySelectorAll('mark');
    expect(marks).toHaveLength(0);
  });

  it('highlights all occurrences in a label', () => {
    const treeWithRepeats: NavigationNode = {
      label: 'Quizzes',
      children: [
        {
          label: 'Testing',
          children: [
            { label: 'Cap Canaveral Capitals', children: [], quizId: 'cap-test' },
          ],
        },
      ],
    };
    render(
      <MemoryRouter>
        <NavigationTree
          root={treeWithRepeats}
          expandedPaths={new Set(['Testing'])}
          onTogglePath={() => {}}
          searchQuery="cap"
        />
      </MemoryRouter>,
    );
    const marks = document.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe('Cap');
    expect(marks[1].textContent).toBe('Cap');
  });

  it('is case-insensitive', () => {
    renderTree(new Set(['Geography']), () => {}, 'FLAG');
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].textContent).toBe('Flag');
  });
});
