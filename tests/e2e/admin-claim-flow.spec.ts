import { test, expect } from '@playwright/test';

const adminUsername = process.env.E2E_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';
const claimCompanySlug = process.env.E2E_COMPANY_SLUG || 'rusty-support-ab';

test.describe('Company claim and approval flow', () => {
  test('company owner can submit a claim and admin approves it', async ({ page }) => {
    const timestamp = Date.now();
    const ownerName = `E2E Owner ${timestamp}`;
    const ownerEmail = `owner+${timestamp}@industrin.test`;

    await test.step('Company owner opens the claim form', async () => {
      await page.goto(`/companies/${claimCompanySlug}`);
      await page.getByTestId('company-claim-button').click();
      await expect(page).toHaveURL(new RegExp(`/ansokkontroll/${claimCompanySlug}`));
    });

    await test.step('Company owner submits a claim request', async () => {
      await page.getByLabel(/Fullständigt namn/i).fill(ownerName);
      await page.getByLabel(/E-postadress/i).fill(ownerEmail);
      await page.getByLabel(/Telefonnummer/i).fill('070-123 45 67');
      await page
        .getByLabel(/Beskriv din relation till företaget/i)
        .fill('Automatiserat ägarintyg skapad av Playwright.');
      await page.getByTestId('claim-consent-checkbox').click();
      await page.getByRole('button', { name: /Skicka ansökan/i }).click();
      await expect(page.getByTestId('claim-success-message')).toContainText('Ansökan skickad', {
        timeout: 20_000,
      });
    });

    await test.step('Admin logs in and approves the claim', async () => {
      await page.goto('/admin/login');
      await page.getByLabel(/Username/i).fill(adminUsername);
      await page.getByLabel(/Password/i).fill(adminPassword);
      await page.getByRole('button', { name: /Sign in/i }).click();

      await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({
        timeout: 30_000,
      });

      await page.getByRole('button', { name: /Claim Requests/i }).click();

      const claimCard = page.getByTestId('claim-card').filter({ hasText: ownerEmail });
      await expect(claimCard).toBeVisible({ timeout: 45_000 });

      await claimCard.getByTestId('approve-claim-button').click();

      const tokenDialog = page.getByTestId('access-token-dialog');
      await expect(tokenDialog).toBeVisible({ timeout: 15_000 });

      const tokenValue = (await tokenDialog.getByTestId('access-token-value').innerText()).trim();
      expect.soft(tokenValue.length).toBeGreaterThan(10);

      await tokenDialog.getByRole('button', { name: /Close/i }).click();
      await expect(tokenDialog).toBeHidden();

      await expect(claimCard.getByText(/Approved/i)).toBeVisible({ timeout: 15_000 });
    });
  });
});


