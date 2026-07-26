import { expect, test, type Page } from '@playwright/test';

type Theme = 'light' | 'dark';

interface VisualStory {
  readonly id: string;
  readonly title: string;
  readonly model3d?: boolean;
}

const THEMES: ReadonlyArray<Theme> = ['light', 'dark'];

const STORIES: ReadonlyArray<VisualStory> = [
  { id: 'theme-colour-palette--side-by-side', title: 'colour palette' },
  { id: 'visualizations-maprenderer--capitals', title: 'map capitals states' },
  { id: 'visualizations-maprenderer--countries', title: 'map country states' },
  {
    id: 'visualizations-maprenderer--country-category-colours',
    title: 'map category colours',
  },
  {
    id: 'visualizations-maprenderer--country-numeric-gradient',
    title: 'map numeric gradient',
  },
  { id: 'visualizations-maprenderer--rivers', title: 'map river states' },
  {
    id: 'visualizations-periodictablerenderer--all-states',
    title: 'periodic table states',
  },
  {
    id: 'visualizations-periodictablerenderer--category-colours',
    title: 'periodic table category colours',
  },
  {
    id: 'visualizations-periodictablerenderer--numeric-gradient',
    title: 'periodic table numeric gradient',
  },
  { id: 'visualizations-timelinerenderer--all-states', title: 'timeline states' },
  {
    id: 'visualizations-timelinerenderer--extended-category-palette',
    title: 'timeline extended category palette',
  },
  { id: 'visualizations-anatomyrenderer--all-states', title: 'anatomy states' },
  {
    id: 'visualizations-anatomyrenderer--per-element-colours',
    title: 'anatomy per-element colours',
  },
  {
    id: 'visualizations-anatomyrenderer--group-colours',
    title: 'anatomy group colours',
  },
  { id: 'visualizations-flaggridrenderer--all-states', title: 'flag grid states' },
  {
    id: 'visualizations-anatomy3drenderer--all-states',
    title: '3D anatomy states',
    model3d: true,
  },
];

async function waitForStory(page: Page, story: VisualStory, theme: Theme) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#storybook-root')).not.toBeEmpty();
  await page.evaluate(() => document.fonts.ready);

  if (story.model3d) {
    // Anatomy3DRenderer keeps the canvas hidden until the GLB has loaded,
    // materials are applied, and the initial camera framing is ready.
    await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });
    const skullPreset = page.getByRole('button', { name: /^Skull/ });
    await expect(skullPreset).toBeEnabled();
    await skullPreset.click();
    // The real camera control eases toward its preset over several frames.
    await page.waitForTimeout(1_500);
  }

  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

test.beforeEach(async ({ page }) => {
  // FlagGridRenderer deliberately shuffles on mount. A seeded generator makes
  // that user-facing behaviour deterministic without changing production code.
  await page.addInitScript(() => {
    let seed = 0x2f6e2b1;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
  });
});

for (const theme of THEMES) {
  for (const story of STORIES) {
    test(`${story.title} — ${theme}`, async ({ page }) => {
      await page.goto(
        `/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`,
        { waitUntil: 'networkidle' },
      );
      await waitForStory(page, story, theme);
      await expect(page).toHaveScreenshot(`${story.id}-${theme}.png`);
    });
  }
}
