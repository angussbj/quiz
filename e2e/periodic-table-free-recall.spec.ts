import { test, expect } from '@playwright/test';

test('corner elements stay in viewport after answering hydrogen', async ({ page }) => {
  await page.goto('/quiz/sci-periodic-table');
  await page.getByRole('button', { name: 'Start Quiz' }).click();
  await page.getByPlaceholder('Type an answer…').waitFor();

  const hydrogen = page.locator('[data-element-id="hydrogen"]');
  const helium = page.locator('[data-element-id="helium"]');
  const actinium = page.locator('[data-element-id="actinium"]');
  const lawrencium = page.locator('[data-element-id="lawrencium"]');

  await expect(hydrogen).toBeInViewport();
  await expect(helium).toBeInViewport();
  await expect(actinium).toBeInViewport();
  await expect(lawrencium).toBeInViewport();

  await page.getByPlaceholder('Type an answer…').type('hydrogen');
  await expect(page.getByText('1/118')).toBeVisible();

  await expect(hydrogen).toBeInViewport();
  await expect(helium).toBeInViewport();
  await expect(actinium).toBeInViewport();
  await expect(lawrencium).toBeInViewport();
});
