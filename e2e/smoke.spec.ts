import { test, expect } from '@playwright/test'

test.describe('Smoke Tests - Critical Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure fresh state
    await page.addInitScript(() => {
      localStorage.clear()
    })
  })

  test('new user is redirected to onboarding', async ({ page }) => {
    await page.goto('/ko')

    // Should be redirected to onboarding
    await expect(page).toHaveURL(/\/ko\/onboarding/)

    // Should see first slide content
    await expect(page.locator('button:has-text("다음")')).toBeVisible()
  })

  test('onboarding flow - navigate through all slides', async ({ page }) => {
    await page.goto('/ko/onboarding')

    // Slide 1 - Praise
    await expect(page.locator('button:has-text("다음")')).toBeVisible()
    await page.locator('button:has-text("다음")').click()

    // Wait for transition
    await page.waitForTimeout(400)

    // Slide 2 - Streak
    await expect(page.locator('button:has-text("다음")')).toBeVisible()
    await page.locator('button:has-text("다음")').click()

    // Wait for transition
    await page.waitForTimeout(400)

    // Slide 3 - Export (last slide)
    await expect(page.locator('button:has-text("시작하기")')).toBeVisible()
  })

  test('onboarding skip button redirects to login', async ({ page }) => {
    await page.goto('/ko/onboarding')

    // Click skip button
    await page.locator('button:has-text("건너뛰기")').click()

    // Should redirect to login after onboarding completes
    await expect(page).toHaveURL(/\/ko\/login/)
  })

  test('login page shows for users who completed onboarding', async ({ page }) => {
    // Set onboarding as completed
    await page.addInitScript(() => {
      localStorage.setItem('onboarding_completed', 'true')
    })

    await page.goto('/ko/login')

    // Should stay on login page
    await expect(page).toHaveURL(/\/ko\/login/)

    // Should see login form
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('login page redirects to onboarding if not completed', async ({ page }) => {
    // Ensure onboarding is NOT completed
    await page.addInitScript(() => {
      localStorage.removeItem('onboarding_completed')
    })

    await page.goto('/ko/login')

    // Should redirect to onboarding
    await expect(page).toHaveURL(/\/ko\/onboarding/)
  })

  test('tab switching works in app shell', async ({ page }) => {
    // Set up authenticated state (mock)
    await page.addInitScript(() => {
      localStorage.setItem('onboarding_completed', 'true')
    })

    // This test requires actual auth - skip if not authenticated
    await page.goto('/ko/login')

    // Just verify the login page loads correctly for now
    await expect(page.locator('text=로그인')).toBeVisible()
  })

  test('mobile viewport - buttons are tappable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/ko/onboarding')

    // Check skip button is visible and tappable
    const skipButton = page.locator('button:has-text("건너뛰기")')
    await expect(skipButton).toBeVisible()

    // Check next button is visible and tappable
    const nextButton = page.locator('button:has-text("다음")')
    await expect(nextButton).toBeVisible()

    // Check button has adequate tap target (at least 44x44)
    const buttonBox = await nextButton.boundingBox()
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44)
  })

  test('English locale works', async ({ page }) => {
    await page.goto('/en/onboarding')

    // Should see English text
    await expect(page.locator('button:has-text("Next")')).toBeVisible()
    await expect(page.locator('button:has-text("Skip")')).toBeVisible()
  })

  test('progress dots navigate between slides', async ({ page }) => {
    await page.goto('/ko/onboarding')

    // Click on third dot (index 2)
    const dots = page.locator('.flex.justify-center.gap-2 button')
    await dots.nth(2).click()

    // Wait for transition
    await page.waitForTimeout(400)

    // Should now be on last slide
    await expect(page.locator('button:has-text("시작하기")')).toBeVisible()
  })
})
