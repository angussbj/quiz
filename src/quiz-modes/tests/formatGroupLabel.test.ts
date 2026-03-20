import { formatGroupLabel } from '../formatGroupLabel';

describe('formatGroupLabel', () => {
  it('capitalizes a single word', () => {
    expect(formatGroupLabel('nonmetal')).toBe('Nonmetal');
  });

  it('converts kebab-case to space-separated with first word capitalized', () => {
    expect(formatGroupLabel('noble-gas')).toBe('Noble gas');
  });

  it('handles multi-hyphen groups', () => {
    expect(formatGroupLabel('alkaline-earth-metal')).toBe('Alkaline earth metal');
  });

  it('handles post-transition-metal', () => {
    expect(formatGroupLabel('post-transition-metal')).toBe('Post transition metal');
  });

  it('handles empty string', () => {
    expect(formatGroupLabel('')).toBe('');
  });
});
