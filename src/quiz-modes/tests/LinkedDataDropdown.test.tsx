import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkedDataDropdown } from '../LinkedDataDropdown';
import type { DropdownOption } from '../TogglePanel';

const options: ReadonlyArray<DropdownOption> = [
  { value: 'population', label: 'Population' },
  { value: 'area', label: 'Area' },
  { value: 'gdp', label: 'GDP' },
  { value: 'density', label: 'Density' },
  { value: 'coastline', label: 'Coastline' },
];

describe('LinkedDataDropdown', () => {
  it('renders a label', () => {
    render(
      <LinkedDataDropdown
        label="Colour by"
        options={options}
        value="none"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('Colour by')).toBeInTheDocument();
  });

  it('always includes a "None" option', () => {
    render(
      <LinkedDataDropdown
        label="Colour by"
        options={options}
        value="none"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('option', { name: 'None' })).toBeInTheDocument();
  });

  it('shows all options when maxOptions is not set', () => {
    render(
      <LinkedDataDropdown
        label="Colour by"
        options={options}
        value="none"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('option', { name: 'Population' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Coastline' })).toBeInTheDocument();
    // None + 5 options = 6
    expect(screen.getAllByRole('option')).toHaveLength(6);
  });

  it('limits data options to maxOptions', () => {
    render(
      <LinkedDataDropdown
        label="Colour by"
        options={options}
        value="none"
        onChange={() => {}}
        maxOptions={3}
      />,
    );
    // None + 3 = 4
    const allOptions = screen.getAllByRole('option');
    expect(allOptions).toHaveLength(4);
    expect(screen.getByRole('option', { name: 'None' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Population' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Area' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'GDP' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Density' })).not.toBeInTheDocument();
  });

  it('shows the currently selected value', () => {
    render(
      <LinkedDataDropdown
        label="Colour by"
        options={options}
        value="gdp"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('combobox')).toHaveValue('gdp');
  });

  it('calls onChange when a different option is selected', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <LinkedDataDropdown
        label="Colour by"
        options={options}
        value="none"
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox'), 'area');
    expect(onChange).toHaveBeenCalledWith('area');
  });

  it('does not count "none" in the options list towards maxOptions', () => {
    const optionsWithNone: ReadonlyArray<DropdownOption> = [
      { value: 'none', label: 'None' },
      { value: 'population', label: 'Population' },
      { value: 'area', label: 'Area' },
    ];
    render(
      <LinkedDataDropdown
        label="Colour by"
        options={optionsWithNone}
        value="none"
        onChange={() => {}}
        maxOptions={1}
      />,
    );
    // None + 1 data option = 2
    const allOptions = screen.getAllByRole('option');
    expect(allOptions).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'None' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Population' })).toBeInTheDocument();
  });

  it('groups options by category when categories are present', () => {
    const categorized: ReadonlyArray<DropdownOption> = [
      { value: 'pop', label: 'Population', category: 'Demographics' },
      { value: 'area', label: 'Area', category: 'Geography' },
    ];
    render(
      <LinkedDataDropdown
        label="Colour by"
        options={categorized}
        value="none"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('group', { name: 'Demographics' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Geography' })).toBeInTheDocument();
  });
});
