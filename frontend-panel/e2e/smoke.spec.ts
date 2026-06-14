import { expect, test } from "@playwright/test";

test("serves the public Yggdrasil entry screen", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveURL(/\/$/);
	await expect(
		page.getByRole("heading", { name: "AsterYggdrasil" }),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Login / Register" }),
	).toBeVisible();
	await expect(page.getByText("Secure authentication")).toBeVisible();
	await expect(page.getByText("Skin management")).toBeVisible();
	await expect(page.getByText("Fast and stable")).toBeVisible();
	await expect(page.getByText("API Root")).toHaveCount(0);
	await expect(page.getByText("Drag URI")).toHaveCount(0);
});

test("shows login as a standalone route and protects dashboard", async ({
	page,
}) => {
	await page.goto("/login");
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
	await expect(page.getByLabel("Email or username")).toBeVisible();
	await expect(page.getByLabel("Password")).toBeVisible();
	await page.getByRole("link", { name: "Register now" }).click();
	await expect(page).toHaveURL(/\/register$/);
	await expect(
		page.getByRole("heading", { name: "Create account" }),
	).toBeVisible();
	await expect(page.getByLabel("Confirm password")).toBeVisible();
	await page.getByRole("link", { name: "Login" }).click();
	await expect(page).toHaveURL(/\/login$/);

	await page.goto("/dashboard");
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("keeps the public entry usable on mobile", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");

	await expect(page.getByRole("link", { name: "Login" }).first()).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Dashboard" }).first(),
	).toBeVisible();
	await expect(page.getByText("Player profiles")).toBeVisible();
	await expect(page.getByText("Skin management")).toBeVisible();
});
