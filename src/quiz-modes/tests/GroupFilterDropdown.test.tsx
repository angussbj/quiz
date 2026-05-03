import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupFilterDropdown } from '../GroupFilterDropdown';

const groups = ['europe', 'asia', 'north-america'];
const allGroups = new Set(groups);

describe('GroupFilterDropdown', () => {
  it('renders a label', () => {
    render(
      <GroupFilterDropdown
        label="Region"
        groups={groups}
        selectedGroups={allGroups}
        onGroupChange={() => {}}
      />,
    );
    expect(screen.getByText('Region')).toBeInTheDocument();
  });

  it('renders an "All" option plus one option per group', () => {
    render(
      <GroupFilterDropdown
        label="Region"
        groups={groups}
        selectedGroups={allGroups}
        onGroupChange={() => {}}
      />,
    );
    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Europe' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Asia' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'North america' })).toBeInTheDocument();
  });

  it('shows "All" as selected when all groups are selected', () => {
    render(
      <GroupFilterDropdown
        label="Region"
        groups={groups}
        selectedGroups={allGroups}
        onGroupChange={() => {}}
      />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('');
  });

  it('shows the single selected group when exactly one is selected', () => {
    render(
      <GroupFilterDropdown
        label="Region"
        groups={groups}
        selectedGroups={new Set(['asia'])}
        onGroupChange={() => {}}
      />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('asia');
  });

  it('shows a disabled "Custom" option when the selection does not match All or a single group', () => {
    render(
      <GroupFilterDropdown
        label="Region"
        groups={groups}
        selectedGroups={new Set(['europe', 'asia'])}
        onGroupChange={() => {}}
      />,
    );
    const customOption = screen.getByRole('option', { name: 'Custom' });
    expect(customOption).toBeInTheDocument();
    expect(customOption).toBeDisabled();
    expect(screen.getByRole('combobox')).toHaveValue('__custom__');
  });

  it('does not render a "Custom" option when selection matches All or a single group', () => {
    const { rerender } = render(
      <GroupFilterDropdown
        label="Region"
        groups={groups}
        selectedGroups={allGroups}
        onGroupChange={() => {}}
      />,
    );
    expect(screen.queryByRole('option', { name: 'Custom' })).not.toBeInTheDocument();

    rerender(
      <GroupFilterDropdown
        label="Region"
        groups={groups}
        selectedGroups={new Set(['europe'])}
        onGroupChange={() => {}}
      />,
    );
    expect(screen.queryByRole('option', { name: 'Custom' })).not.toBeInTheDocument();
  });

  it('calls onGroupChange with undefined when "All" is selected', async () => {
    const user = userEvent.setup();
    const onGroupChange = jest.fn();
    render(
      <GroupFilterDropdown
        label="Region"
        groups={groups}
        selectedGroups={new Set(['europe'])}
        onGroupChange={onGroupChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox'), '');
    expect(onGroupChange).toHaveBeenCalledWith(undefined);
  });

  it('calls onGroupChange with the group string when a group is selected', async () => {
    const user = userEvent.setup();
    const onGroupChange = jest.fn();
    render(
      <GroupFilterDropdown
        label="Region"
        groups={groups}
        selectedGroups={allGroups}
        onGroupChange={onGroupChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox'), 'europe');
    expect(onGroupChange).toHaveBeenCalledWith('europe');
  });

  it('formats group labels using formatGroupLabel', () => {
    render(
      <GroupFilterDropdown
        label="Category"
        groups={['noble-gas', 'alkali-metal']}
        selectedGroups={new Set(['noble-gas', 'alkali-metal'])}
        onGroupChange={() => {}}
      />,
    );
    expect(screen.getByRole('option', { name: 'Noble gas' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alkali metal' })).toBeInTheDocument();
  });
});
