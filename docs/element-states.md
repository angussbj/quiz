# Element Visual States

Contract between quiz modes (producers) and renderers (consumers).

## State Table

| State | Colour | Labels | Interactive | Description |
|---|---|---|---|---|
| `default` | Muted/neutral | Per toggle | Yes | Visible, not yet answered |
| `hidden` | Invisible | No | No | Toggle-driven hiding or progressive reveal |
| `highlighted` | Accent | Per toggle | Yes | Current prompt target (prompted/ordered recall) |
| `correct` | Green | Yes | No | Correct, 1st attempt |
| `correct-second` | Yellow | Yes | No | Correct, 2nd attempt |
| `correct-third` | Amber | Yes | No | Correct, 3rd attempt |
| `incorrect` | Red | Yes | No | Actively wrong — tried and failed |
| `missed` | Dark red | Yes | No | Passively unanswered — skipped or gave up |
| `context` | Neutral | Yes | No | Non-interactive reference for spatial/structural context |

## Per-Mode Usage

| State | Free Recall | Ordered Recall | Identify | Locate | Prompted Recall |
|---|---|---|---|---|---|
| `default` | All at start | — | All at start | — | Unprompted |
| `hidden` | Toggle-driven | Future slots | — | Unplaced interactive | — |
| `highlighted` | — | Current slot | — | — | Current prompt |
| `correct` | Typed correctly | Typed correctly | Correct (1st) | Placed accurately | Answered correctly |
| `correct-second` | — | — | Correct (2nd) | — | — |
| `correct-third` | — | — | Correct (3rd) | — | — |
| `incorrect` | — | — | Wrong flash (temp) / skip / exhausted (perm) | Placed inaccurately | — |
| `missed` | Give up | Give up / skip | Give up | Give up | Give up / skip |
| `context` | — | — | — | Non-interactive reference | — |
