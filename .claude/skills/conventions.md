---
name: conventions
description: Checklist of project conventions to follow when writing new components or features
---

# Project Conventions

Before writing code, review the project CLAUDE.md. Use this checklist for every new component or feature.

## Checklist

- [ ] Types imported from producer directories (`src/visualizations/`, `src/quiz-modes/`, etc.), not redefined
- [ ] CSS module created alongside component (`Component.module.css`)
- [ ] All colors use CSS custom properties from `src/theme/theme.css`
- [ ] Test file created in adjacent `tests/` directory
- [ ] No `as` casts, no `as any`
- [ ] All interface fields are `readonly`
- [ ] Animations use Framer Motion
- [ ] File name matches main export (PascalCase for components, camelCase for functions/hooks)
- [ ] Component has a single clear responsibility
- [ ] Conventional commit message when done
