import { buildOrderedRecallSelectToggles } from '../buildOrderedRecallSelectToggles';

describe('buildOrderedRecallSelectToggles', () => {
  it('returns empty array when no sort columns provided', () => {
    expect(buildOrderedRecallSelectToggles([])).toEqual([]);
  });

  it('generates three select toggles', () => {
    const columns = [
      { column: 'atomic_number', label: 'Atomic number' },
      { column: 'density', label: 'Density' },
    ];
    const result = buildOrderedRecallSelectToggles(columns);
    expect(result).toHaveLength(3);
  });

  it('creates an orderBy dropdown with column options', () => {
    const columns = [
      { column: 'atomic_number', label: 'Atomic number' },
      { column: 'density', label: 'Density' },
    ];
    const result = buildOrderedRecallSelectToggles(columns);
    const orderBy = result.find((t) => t.key === 'orderBy');

    expect(orderBy).toBeDefined();
    expect(orderBy?.renderAs).toBe('dropdown');
    expect(orderBy?.defaultValue).toBe('atomic_number');
    expect(orderBy?.options).toEqual([
      { value: 'atomic_number', label: 'Atomic number' },
      { value: 'density', label: 'Density' },
    ]);
    expect(orderBy?.modes).toEqual(['free-recall-ordered']);
  });

  it('creates a sortOrder segmented control', () => {
    const columns = [{ column: 'x', label: 'X' }];
    const result = buildOrderedRecallSelectToggles(columns);
    const sortOrder = result.find((t) => t.key === 'sortOrder');

    expect(sortOrder).toBeDefined();
    expect(sortOrder?.renderAs).toBe('segmented');
    expect(sortOrder?.defaultValue).toBe('ascending');
    expect(sortOrder?.options).toHaveLength(2);
    expect(sortOrder?.modes).toEqual(['free-recall-ordered']);
  });

  it('creates a missingValues segmented control', () => {
    const columns = [{ column: 'x', label: 'X' }];
    const result = buildOrderedRecallSelectToggles(columns);
    const missingValues = result.find((t) => t.key === 'missingValues');

    expect(missingValues).toBeDefined();
    expect(missingValues?.renderAs).toBe('segmented');
    expect(missingValues?.defaultValue).toBe('exclude');
    expect(missingValues?.options).toHaveLength(3);
    expect(missingValues?.modes).toEqual(['free-recall-ordered']);
  });

  it('all toggles belong to the ordering group', () => {
    const columns = [{ column: 'x', label: 'X' }];
    const result = buildOrderedRecallSelectToggles(columns);
    for (const toggle of result) {
      expect(toggle.group).toBe('ordering');
    }
  });

  it('passes through infoUrl when present on sort columns', () => {
    const columns = [
      { column: 'population', label: 'Population', infoUrl: '/about/country-statistics' },
      { column: 'gdp', label: 'GDP' },
    ];
    const result = buildOrderedRecallSelectToggles(columns);
    const orderBy = result.find((t) => t.key === 'orderBy');

    expect(orderBy?.options[0]).toEqual({
      value: 'population',
      label: 'Population',
      infoUrl: '/about/country-statistics',
    });
    expect(orderBy?.options[1]).toEqual({
      value: 'gdp',
      label: 'GDP',
    });
  });

  it('passes through category when present on sort columns', () => {
    const columns = [
      { column: 'population', label: 'Population', category: 'Demographics' },
      { column: 'gdp', label: 'GDP', category: 'Economy' },
      { column: 'area', label: 'Area' },
    ];
    const result = buildOrderedRecallSelectToggles(columns);
    const orderBy = result.find((t) => t.key === 'orderBy');

    expect(orderBy?.options[0]).toEqual({
      value: 'population',
      label: 'Population',
      category: 'Demographics',
    });
    expect(orderBy?.options[1]).toEqual({
      value: 'gdp',
      label: 'GDP',
      category: 'Economy',
    });
    expect(orderBy?.options[2]).toEqual({
      value: 'area',
      label: 'Area',
    });
  });
});
