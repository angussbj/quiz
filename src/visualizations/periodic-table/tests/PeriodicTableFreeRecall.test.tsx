import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FreeRecallMode } from '@/quiz-modes/free-recall/FreeRecallMode';
import { PeriodicTableRenderer } from '../PeriodicTableRenderer';
import { buildGridElements } from '../buildGridElements';
import { parseCsv } from '@/quiz-definitions/parseCsv';

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ preference: 'system', resolved: 'light', setPreference: jest.fn() }),
}));

jest.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TransformComponent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useControls: () => ({
    setTransform: jest.fn(),
    centerView: jest.fn(),
  }),
  useTransformEffect: (cb: (ref: { state: { scale: number } }) => void) => {
    cb({ state: { scale: 1 } });
  },
}));

const csvPath = resolve(__dirname, '../../../../public/data/science/chemistry/periodic-table.csv');
const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const columnMappings = { answer: 'name', label: 'name', group: 'category' };
const elements = buildGridElements(rows, columnMappings);

function queryCorners(container: HTMLElement) {
  return {
    hydrogen: container.querySelector('g[data-element-id="hydrogen"]'),
    helium: container.querySelector('g[data-element-id="helium"]'),
    actinium: container.querySelector('g[data-element-id="actinium"]'),
    lawrencium: container.querySelector('g[data-element-id="lawrencium"]'),
  };
}

describe('Periodic table free recall', () => {
  it('corner elements stay in view after answering hydrogen', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FreeRecallMode
        elements={elements}
        dataRows={rows}
        columnMappings={columnMappings}
        toggleDefinitions={[]}
        toggleValues={{}}
        Renderer={PeriodicTableRenderer}
        onFinish={jest.fn()}
        onReconfigure={jest.fn()}
      />,
    );

    const before = queryCorners(container);
    expect(before.hydrogen).toBeInTheDocument();
    expect(before.helium).toBeInTheDocument();
    expect(before.actinium).toBeInTheDocument();
    expect(before.lawrencium).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Type an answer…'), 'hydrogen');
    expect(screen.getByText('1/118')).toBeInTheDocument();

    const after = queryCorners(container);
    expect(after.hydrogen).toBeInTheDocument();
    expect(after.helium).toBeInTheDocument();
    expect(after.actinium).toBeInTheDocument();
    expect(after.lawrencium).toBeInTheDocument();
  });
});
