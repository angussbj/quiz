import { getQuizById } from '../getQuizById';
import { quizRegistry } from '../quizRegistry';

describe('getQuizById', () => {
  it('returns a quiz definition for a valid ID', () => {
    const quiz = getQuizById('geo-capitals-europe');
    expect(quiz).toBeDefined();
    expect(quiz!.title).toBe('European Capitals');
  });

  it('returns undefined for an unknown ID', () => {
    expect(getQuizById('nonexistent')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(getQuizById('')).toBeUndefined();
  });

  it('finds every quiz in the registry', () => {
    for (const definition of quizRegistry) {
      expect(getQuizById(definition.id)).toBe(definition);
    }
  });
});
