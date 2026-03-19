# History Quiz Guidelines

Principles for selecting and grouping events in history timeline quizzes.

## Event Selection

- **Globally neutral**: Frame events and categories from a global perspective, not any single nation's viewpoint. Avoid terms like "Home Front" (whose home?) or "Our troops."
- **All sides represented**: Include events from all major participants, not just the victors. Technology events should cover innovations from all sides.
- **Full timespan coverage**: Spread events across the entire period. Avoid clustering events at the start or end.
- **Difficulty range**: Mix well-known events (D-Day, Pearl Harbor) with moderately-known ones (Wannsee Conference, Katyusha rockets) for a range of difficulty.
- **Commonly known English names**: Use the most widely recognized English name as the primary answer. Add alternate names via the `event_alternates` column (pipe-separated).

## Date Verification

- **Cross-check against reliable sources**: Verify all dates against at least one external reference (Britannica, academic sources). Do NOT rely on LLM knowledge alone for historical dates.
- **Date precision**: Use the most specific dates available — day-level for battles with clear start/end dates, month-level for longer campaigns or events with debated exact dates.
- **Contested dates**: Where historians disagree on exact dates (e.g., when Operation Barbarossa "ended"), use the most commonly cited dates and note the choice in the PR description.

## Categories / Grouping

- **Geographically or thematically distinct**: Categories should not heavily overlap. "European Theatre" and "Eastern Front" are distinct geographic theatres; "Naval War" would overlap with "Pacific Theatre."
- **No national viewpoints**: Avoid categories that assume a particular national perspective. "Home Front" assumes a specific nation. "Strategic & Technology" is globally neutral.
- **Balanced representation**: Each category should have roughly similar event counts (5-8 events each). One tiny category signals it should be merged.
- **The `group` column**: In the CSV, the group column maps to category colours in the timeline renderer. The column name in `columnMappings` should describe what the grouping represents (e.g., `theatre` for war theatres, `dynasty` for ruling periods).

## CSV Format for Timeline Quizzes

Columns: `id,{answer_column},start_year[,start_month[,start_day]],end_year[,end_month[,end_day]][,{group_column}],{answer_column}_alternates`

- The `{answer_column}` name matches `columnMappings.answer` in the quiz definition (e.g. `event` for WW2, `emperor` for Roman Emperors)
- Month and day columns are optional — omit them entirely for year-precision quizzes (e.g. Roman Emperors uses only `start_year,end_year`)
- Single-day events (with month/day columns present): leave end_year, end_month, end_day empty (e.g. `6,,,,European Theatre`)
- `{group_column}` is optional — omit for quizzes with no meaningful thematic grouping
- The `{answer_column}_alternates` column uses `|` as separator
- IDs should be lowercase-hyphenated versions of the answer name

## Locate Mode & Date Precision

The date precision toggle (`year` / `month` / `day`) controls:
1. What the user needs to enter (a year, a month+year, or a full date)
2. Whether range entry is needed (if start and end differ at that precision)
3. Scoring tolerance (tighter at day precision, looser at year precision)

When selecting events, consider how they play at different precision levels:
- Year precision: only events spanning >1 year need range entry
- Month precision: events spanning >1 month need range entry (most multi-month battles)
- Day precision: events spanning >1 day need range entry (most events)
