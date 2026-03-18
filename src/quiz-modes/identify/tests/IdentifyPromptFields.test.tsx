import { render, screen } from '@testing-library/react';
import { IdentifyPromptFields } from '../IdentifyPromptFields';

describe('IdentifyPromptFields', () => {
  it('renders nothing when no fields are active', () => {
    const { container } = render(
      <IdentifyPromptFields fields={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a text field', () => {
    render(
      <IdentifyPromptFields fields={[{ type: 'text', value: 'France' }]} />,
    );
    expect(screen.getByText('France')).toBeInTheDocument();
  });

  it('renders a flag image', () => {
    render(
      <IdentifyPromptFields fields={[{ type: 'flag', value: 'fr' }]} />,
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/flags/fr.svg');
  });

  it('renders multiple fields', () => {
    render(
      <IdentifyPromptFields
        fields={[
          { type: 'flag', value: 'fr' },
          { type: 'text', value: 'France' },
        ]}
      />,
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('France')).toBeInTheDocument();
  });
});
