import type { ReactNode } from 'react';

interface QuizShellProps {
  readonly children: ReactNode;
}

/** Wraps a quiz mode with shared UI: toggles, timer, score display. Placeholder. */
export function QuizShell({ children }: QuizShellProps) {
  return <div>{children}</div>;
}
