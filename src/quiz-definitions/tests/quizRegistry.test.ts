import { quizRegistry } from '../quizRegistry';

describe('quizRegistry', () => {
  it('contains at least one quiz', () => {
    expect(quizRegistry.length).toBeGreaterThan(0);
  });

  it('has unique IDs', () => {
    const ids = quizRegistry.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every quiz has a non-empty path', () => {
    for (const quiz of quizRegistry) {
      expect(quiz.path.length).toBeGreaterThan(0);
    }
  });

  it('every quiz has its defaultMode in availableModes', () => {
    for (const quiz of quizRegistry) {
      expect(quiz.availableModes).toContain(quiz.defaultMode);
    }
  });

  it('every quiz has a non-empty dataPath', () => {
    for (const quiz of quizRegistry) {
      expect(quiz.dataPath.length).toBeGreaterThan(0);
    }
  });

  it('every toggle key in presets matches a defined toggle', () => {
    for (const quiz of quizRegistry) {
      const toggleKeys = new Set(quiz.toggles.map((t) => t.key));
      for (const preset of quiz.presets) {
        for (const key of Object.keys(preset.values)) {
          expect(toggleKeys).toContain(key);
        }
      }
    }
  });
});
