import { renderHook, act } from '@testing-library/react';
import { useNavigationState } from '../useNavigationState';
import type { NavigationNode } from '../NavigationNode';

const tree: NavigationNode = {
  label: 'Root',
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
        {
          label: 'Chemistry',
          children: [
            { label: 'Elements', children: [], quizId: 'elements' },
          ],
        },
      ],
    },
  ],
};

describe('useNavigationState', () => {
  describe('initial state', () => {
    it('starts with all category paths expanded', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      expect(result.current.expandedPaths.has('Geography')).toBe(true);
      expect(result.current.expandedPaths.has('Science')).toBe(true);
      expect(result.current.expandedPaths.has('Science/Chemistry')).toBe(true);
    });

    it('starts with empty search query', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      expect(result.current.searchQuery).toBe('');
    });

    it('returns full tree as displayTree', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      expect(result.current.displayTree).toBe(tree);
    });
  });

  describe('search activation threshold', () => {
    it('does not activate search for query under 3 characters', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      act(() => {
        result.current.setSearchQuery('ca');
      });
      expect(result.current.displayTree).toBe(tree);
    });

    it('activates search when query reaches 3 characters', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      act(() => {
        result.current.setSearchQuery('cap');
      });
      expect(result.current.displayTree).not.toBe(tree);
    });

    it('returns to full tree when query drops below 3 characters', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      act(() => {
        result.current.setSearchQuery('cap');
      });
      expect(result.current.displayTree).not.toBe(tree);
      act(() => {
        result.current.setSearchQuery('ca');
      });
      expect(result.current.displayTree).toBe(tree);
    });
  });

  describe('filtered tree', () => {
    it('returns filtered tree when query >= 3 chars', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      act(() => {
        result.current.setSearchQuery('cap');
      });
      const leaves = result.current.displayTree.children
        .flatMap((c) => c.children)
        .filter((c) => c.quizId !== undefined);
      expect(leaves).toHaveLength(1);
      expect(leaves[0].label).toBe('Capitals');
    });

    it('returns empty tree when no nodes match', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      act(() => {
        result.current.setSearchQuery('zzzzz');
      });
      expect(result.current.displayTree.children).toHaveLength(0);
    });

    it('expands all category paths in filtered tree', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      act(() => {
        result.current.setSearchQuery('ele');
      });
      expect(result.current.expandedPaths.has('Science')).toBe(true);
      expect(result.current.expandedPaths.has('Science/Chemistry')).toBe(true);
    });
  });

  describe('manual toggle', () => {
    it('blocks manual toggle during active search', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      act(() => {
        result.current.setSearchQuery('cap');
      });
      const pathsBefore = result.current.expandedPaths;
      act(() => {
        result.current.onTogglePath('Geography');
      });
      expect(result.current.expandedPaths).toBe(pathsBefore);
    });

    it('allows manual toggle when search is inactive', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      expect(result.current.expandedPaths.has('Geography')).toBe(true);
      act(() => {
        result.current.onTogglePath('Geography');
      });
      expect(result.current.expandedPaths.has('Geography')).toBe(false);
    });

    it('toggles path back on after toggling off', () => {
      const { result } = renderHook(() => useNavigationState(tree));
      act(() => {
        result.current.onTogglePath('Geography');
      });
      expect(result.current.expandedPaths.has('Geography')).toBe(false);
      act(() => {
        result.current.onTogglePath('Geography');
      });
      expect(result.current.expandedPaths.has('Geography')).toBe(true);
    });
  });
});
