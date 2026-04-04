import { formatDataValue } from '../formatDataValue';

describe('formatDataValue', () => {
  describe('missing values', () => {
    it('returns dash for undefined', () => {
      expect(formatDataValue(undefined, 'Population')).toBe('—');
    });

    it('returns dash for empty string', () => {
      expect(formatDataValue('', 'Population')).toBe('—');
    });
  });

  describe('compact number formatting', () => {
    it('formats billions', () => {
      expect(formatDataValue('1400000000', 'Population')).toBe('1.4B');
    });

    it('formats millions', () => {
      expect(formatDataValue('67000000', 'Population')).toBe('67M');
    });

    it('formats thousands', () => {
      expect(formatDataValue('8900', 'Population')).toBe('8.9K');
    });

    it('formats small numbers', () => {
      expect(formatDataValue('42', 'Some metric')).toBe('42');
    });

    it('formats trillions', () => {
      expect(formatDataValue('25000000000000', 'GDP nominal (USD)')).toBe('$25T');
    });
  });

  describe('USD columns', () => {
    it('formats GDP with dollar prefix', () => {
      expect(formatDataValue('21400000000000', 'GDP nominal (USD)')).toBe('$21.4T');
    });

    it('formats GDP per capita', () => {
      expect(formatDataValue('65298', 'GDP per capita (USD)')).toBe('$65.3K');
    });

    it('formats small USD values', () => {
      expect(formatDataValue('12.5', 'Foreign aid given per capita (USD)')).toBe('$12.5');
    });

    it('detects USD in label without parentheses', () => {
      expect(formatDataValue('1999', 'Cost USD/kg (1999–2025)')).toBe('$2K');
    });
  });

  describe('percentage columns', () => {
    it('formats percentage', () => {
      expect(formatDataValue('43.21', 'Forest cover (%)')).toBe('43.2%');
    });

    it('formats small percentage', () => {
      expect(formatDataValue('0.5', 'Population growth (% annual)')).toBe('0.5%');
    });

    it('formats large percentage', () => {
      expect(formatDataValue('99.7', 'Literacy rate (%)')).toBe('99.7%');
    });
  });

  describe('columns with units', () => {
    it('formats area with unit', () => {
      expect(formatDataValue('9833520', 'Land area (km²)')).toBe('9.83M km²');
    });

    it('formats density with unit', () => {
      expect(formatDataValue('503.5', 'Population density (per km²)')).toBe('504 per km²');
    });

    it('formats temperature', () => {
      expect(formatDataValue('21.3', 'Average temperature (°C)')).toBe('21.3 °C');
    });

    it('formats elevation', () => {
      expect(formatDataValue('8849', 'Highest point (m)')).toBe('8.85K m');
    });
  });

  describe('year columns', () => {
    it('formats year as plain integer', () => {
      expect(formatDataValue('1789', 'Year discovered')).toBe('1789');
    });
  });

  describe('state column', () => {
    it('capitalizes first letter', () => {
      expect(formatDataValue('solid', 'State')).toBe('Solid');
    });

    it('handles gas', () => {
      expect(formatDataValue('gas', 'State')).toBe('Gas');
    });
  });

  describe('half-life column', () => {
    it('formats stable elements', () => {
      expect(formatDataValue(undefined, 'Half-life')).toBe('—');
    });

    it('formats seconds', () => {
      const result = formatDataValue('3.156e+15', 'Half-life');
      expect(result).toContain('My'); // megayears
    });

    it('formats short half-lives', () => {
      const result = formatDataValue('0.001', 'Half-life');
      expect(result).toContain('ms');
    });
  });

  describe('approximate and estimate markers', () => {
    it('preserves approximate prefix', () => {
      expect(formatDataValue('~1000', 'Some metric')).toBe('~1K');
    });

    it('preserves estimate suffix', () => {
      expect(formatDataValue('1000?', 'Some metric')).toBe('1K?');
    });

    it('preserves both markers', () => {
      expect(formatDataValue('~1000?', 'Some metric')).toBe('~1K?');
    });

    it('handles approximate USD values', () => {
      expect(formatDataValue('~500', 'Cost USD/kg (1999–2025)')).toBe('~$500');
    });
  });

  describe('negative values', () => {
    it('preserves negative sign for percentages', () => {
      expect(formatDataValue('-0.5', 'Population growth (% annual)')).toBe('-0.5%');
    });

    it('preserves negative sign for USD', () => {
      expect(formatDataValue('-1200', 'Net value (USD)')).toBe('-$1.2K');
    });

    it('preserves negative sign for unit columns', () => {
      expect(formatDataValue('-50000', 'Net migration')).toBe('-50K');
    });
  });

  describe('non-numeric values', () => {
    it('returns non-numeric strings as-is', () => {
      expect(formatDataValue('N/A', 'Some column')).toBe('N/A');
    });
  });
});
