import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';

const COLOR_GROUPS: ReadonlyArray<{ readonly title: string; readonly vars: ReadonlyArray<string> }> = [
  {
    title: 'Background',
    vars: ['--color-bg-primary', '--color-bg-secondary', '--color-bg-tertiary', '--color-surface-raised'],
  },
  {
    title: 'Text',
    vars: ['--color-text-primary', '--color-text-secondary', '--color-text-muted', '--color-on-color-fill', '--color-on-accent'],
  },
  {
    title: 'Interactive',
    vars: ['--color-link', '--color-link-hover', '--color-accent', '--color-accent-hover'],
  },
  {
    title: 'Feedback',
    vars: [
      '--color-correct', '--color-correct-bg',
      '--color-correct-second', '--color-correct-second-bg',
      '--color-correct-third', '--color-correct-third-bg',
      '--color-incorrect', '--color-incorrect-bg',
      '--color-missed', '--color-missed-bg',
      '--color-context', '--color-context-bg',
      '--color-highlight', '--color-highlight-bg',
    ],
  },
  {
    title: 'Map & labels',
    vars: ['--color-city-dot', '--color-label-halo', '--color-lake', '--color-border'],
  },
  {
    title: 'Groups',
    vars: [
      '--color-group-1', '--color-group-2', '--color-group-3', '--color-group-4',
      '--color-group-5', '--color-group-6', '--color-group-7', '--color-group-8',
    ],
  },
];

interface Variant {
  readonly label: string;
  readonly theme: 'light' | 'dark';
}

const VARIANTS: ReadonlyArray<Variant> = [
  { label: 'Light', theme: 'light' },
  { label: 'Dark', theme: 'dark' },
];

function VariantPanel({ variant, children }: { readonly variant: Variant; readonly children: ReactNode }) {
  const panelStyle: CSSProperties = {
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    padding: '16px',
    borderRadius: '8px',
    minWidth: 0,
    fontFamily: 'var(--font-family)',
  };
  return (
    <div data-theme={variant.theme} style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>{variant.label}</div>
      {children}
    </div>
  );
}

function Swatch({ variable }: { readonly variable: string }) {
  const swatchStyle: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 4,
    background: `var(${variable})`,
    border: '1px solid var(--color-border)',
    flexShrink: 0,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <div style={swatchStyle} />
      <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
        {variable}
      </code>
    </div>
  );
}

function GroupSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--color-text-muted)',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function AllVariables() {
  return (
    <>
      {COLOR_GROUPS.map((group) => (
        <GroupSection key={group.title} title={group.title}>
          {group.vars.map((v) => (
            <Swatch key={v} variable={v} />
          ))}
        </GroupSection>
      ))}
    </>
  );
}

const meta: Meta = {
  title: 'Theme/Colour Palette',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj;

export const SideBySide: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 16,
        background: '#888',
        padding: 16,
        minHeight: '100vh',
      }}
    >
      {VARIANTS.map((variant) => (
        <VariantPanel key={variant.label} variant={variant}>
          <AllVariables />
        </VariantPanel>
      ))}
    </div>
  ),
};
