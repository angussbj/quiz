# Toggle Resolution

Toggles control visual features like labels, borders, city dots, and flags. The user sees a simple on/off switch per toggle on the config screen. But "off" doesn't always mean "never show" — it can mean different things depending on the quiz definition.

## Hidden Behaviors

When a toggle is off, `hiddenBehavior` determines what actually happens per element:

- **`'never'`** — never shown during the quiz
- **`'on-reveal'`** — shown when the element is answered (correct or give-up)
- **`{ hintAfter: n }`** — shown after the nth incorrect answer for that element (e.g., show the flag as a hint after 2 wrong guesses)

## Data Model

```ts
type HiddenBehavior = 'never' | 'on-reveal' | { readonly hintAfter: number };

interface ToggleDefinition {
  readonly key: string;
  readonly label: string;
  readonly defaultValue: boolean;
  readonly group: string;
  readonly hiddenBehavior: HiddenBehavior; // what "off" means for this toggle
}
```

Presets remain `Record<string, boolean>` — they set toggles on/off. The hidden behavior is fixed per toggle definition, not per preset.

## Resolution Flow

1. **Config screen:** User sees boolean switches. "On" = always show. "Off" = hidden behavior applies.
2. **Quiz mode layer:** Each quiz mode resolves toggles into **per-element booleans** based on quiz state (which elements are answered, how many wrong answers per element). The shared utility `resolveElementToggles()` in `src/quiz-modes/resolveElementToggles.ts` handles this. It takes element quiz states (`ElementQuizState`: `isAnswered` + `wrongAttempts`) and returns per-element toggle overrides.
3. **Renderer:** Receives `elementToggles: Record<elementId, Record<toggleKey, boolean>>` — fully resolved, no knowledge of hidden behaviors. Renderers check `elementToggles?.[elementId]?.[toggleKey] ?? toggles[toggleKey]`. The global `toggles` remains the fallback.

## Defaults

`elementToggle()` defaults to `true` when a toggle key isn't in global toggles — features are visible unless explicitly turned off.

## Per-Mode Behavior

- **Free Recall:** `'on-reveal'` → true when answered. `{ hintAfter: n }` → not applicable (no wrong answers). `'never'` → always false.
- **Identify:** Track incorrect answer count per element. `{ hintAfter: n }` → true after n wrong clicks. `'on-reveal'` → true after correct or skip.
- **Locate:** Toggle resolution was unified via `resolveElementToggles()`.

## Future: Advanced Config

An advanced option on the config screen could let users override the hidden behavior per toggle (e.g., change "on-reveal" to "hint after 3"). Nice-to-have, not yet implemented.
