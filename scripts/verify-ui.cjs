const { chromium } = require("playwright");
const fs = require("node:fs"),
  path = require("node:path");
const base = process.env.UI_PREVIEW_URL ?? "http://localhost:3000",
  out = process.env.UI_QA_DIR ?? "/private/tmp/language-stories-restored-ui";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (req) => {
      if (req.url().includes(":4001"))
        errors.push("Frontend requested voice API");
    });
    const shot = async (name) => {
      await page.waitForTimeout(180);
      await page.screenshot({
        path: path.join(out, name + ".png"),
        fullPage: true,
      });
    };
    // A full reload resets the current splash lifecycle. Follow the existing
    // onboarding brand link back Home after that splash, without changing the UI.
    const completeReturningSplash = async () => {
      const splash = page.getByRole("main", { name: "Language Stories splash" });
      await Promise.race([
        splash.waitFor({ state: "visible" }),
        page.getByRole("button", { name: "Open profile menu" }).waitFor(),
      ]);
      if (await splash.isVisible()) {
        await page.getByRole("link", { name: "Start your story →" }).waitFor();
        await page.getByRole("link", { name: "Language Stories", exact: true }).click();
      }
    };
    const go = async (route) => {
      await page.goto(base + route);
      if (route === "/") await completeReturningSplash();
    };
    const nav = (label) =>
      page
        .getByRole("navigation")
        .getByRole("link", { name: label, exact: true });
    await go("/welcome");
    await page.getByRole("link", { name: "Start your story →" }).waitFor();
    await shot("01-welcome");
    await page.getByRole("link", { name: "Start your story →" }).click();
    await page.getByPlaceholder("What should we call you?").fill("Ahad");
    await page.getByPlaceholder("you@example.com").fill("ahad@example.com");
    await page.getByPlaceholder("At least 8 characters").fill("PreviewOnly123");
    await shot("02-create-account");
    await page
      .getByRole("button", { name: "Create account →", exact: true })
      .click();
    await page.getByRole("button", { name: /English New in London/ }).click();
    await shot("03-language");
    await page.getByRole("button", { name: "Continue →", exact: true }).click();
    await page.getByRole("button", { name: /A2 Building/ }).click();
    await shot("04-level");
    await page.getByRole("button", { name: "Continue →", exact: true }).click();
    await shot("05-complete-setup");
    await page.getByRole("button", { name: "Let’s begin →" }).click();
    await completeReturningSplash();
    await page.getByRole("heading", { name: "Hello, Ahad." }).waitFor();
    await shot("06-home");
    await page.getByRole("button", { name: "Open profile menu" }).click();
    await shot("07-profile-menu");
    await page.getByRole("link", { name: "Your profile", exact: true }).click();
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Ahad Learner");
    await page.getByLabel("Mobile number (optional)").fill("1234567890");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByText("Your profile is saved on this device.").waitFor();
    await shot("08-profile");
    await page.getByRole("link", { name: "Change password →" }).click();
    await page.getByLabel("Current password").fill("PreviewOnly123");
    await page
      .getByLabel("New password", { exact: true })
      .fill("AnotherPreview123");
    await page.getByLabel("Confirm new password").fill("AnotherPreview123");
    await shot("09-password");
    await page.getByRole("button", { name: "Update password" }).click();
    await page.getByText("That’s how it will look.").waitFor();
    await nav("Home").click();
    await page.getByRole("button", { name: "Open profile menu" }).click();
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await page.getByLabel("Current level", { exact: true }).selectOption("B1");
    await page.getByRole("button", { name: "Confirm preferences" }).click();
    await page
      .getByText("Preferences saved. Your progress is still here.")
      .waitFor();
    await page.getByRole("switch", { name: "Daily practice reminder" }).click();
    await page.getByLabel("Reminder time").fill("18:30");
    await page.getByRole("radio", { name: "Instant", exact: true }).click();
    await page.getByRole("button", { name: "☾ Evening" }).click();
    if ((await page.locator("html").getAttribute("data-appearance")) !== "dark")
      throw Error("Appearance did not apply");
    await shot("10-settings-evening");
    await page.getByRole("button", { name: "☀ Parchment" }).click();
    await shot("11-settings");
    await nav("Stories").click();
    await page.getByRole("heading", { name: "Stories", exact: true }).waitFor();
    await shot("12-original-library");
    await page
      .getByRole("link", { name: "Episodes", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "New in London", exact: true })
      .waitFor();
    await shot("13-original-story-detail");
    await page.locator('a[href="/play/new-in-london/ep2?new=1"]').click();
    await page
      .getByText(
        "Day 3. Class starts in twenty minutes, and you really need coffee.",
        { exact: true },
      )
      .waitFor();
    for (let i = 0; i < 6; i++) {
      if (
        await page
          .getByRole("button", { name: "Bookmark story line" })
          .isVisible()
      )
        break;
      await page.keyboard.press("Space");
      await page.waitForTimeout(120);
    }
    await page.getByRole("button", { name: "Bookmark story line" }).waitFor();
    await page.getByRole("button", { name: "Bookmark story line" }).click();
    await shot("14-original-player");
    await page.getByRole("button", { name: "Remove story bookmark" }).waitFor();
    await go("/notebook?tab=bookmarks");
    await page.getByRole("link", { name: "Return to the story →" }).waitFor();
    await shot("15-bookmarks");
    await page.getByRole("tab", { name: /Notes/ }).click();
    await page.getByRole("button", { name: "＋ Add a personal note" }).click();
    await page.getByLabel("Title", { exact: true }).fill("Coffee notes");
    await page
      .getByLabel("Your note", { exact: true })
      .fill("Could I have a latte, please?");
    await page.getByRole("button", { name: "Save note", exact: true }).click();
    await page.getByRole("heading", { name: "Coffee notes" }).waitFor();
    await page.getByRole("button", { name: "Edit note", exact: true }).click();
    await page
      .getByLabel("Your note", { exact: true })
      .fill("Could I have a latte, please? Remember to say thanks.");
    await page.getByRole("button", { name: "Save note", exact: true }).click();
    await shot("16-notes");
    await page.reload();
    await page.getByRole("tab", { name: /Notes/ }).click();
    await page
      .getByText("Could I have a latte, please? Remember to say thanks.")
      .waitFor();
    await page.getByRole("tab", { name: /Words/ }).click();
    await page.getByRole("button", { name: "＋ Add word" }).click();
    await page
      .getByRole("searchbox", { name: "Find a word to save" })
      .fill("latte");
    await page
      .getByRole("button", { name: /latte.*Save ＋/i })
      .first()
      .click();
    await page
      .getByRole("searchbox", { name: "Search the notebook" })
      .fill("latte");
    await page
      .getByRole("button", { name: "Remove latte from notebook" })
      .waitFor();
    await shot("17-words");
    await page
      .getByRole("button", { name: "Remove latte from notebook" })
      .click();
    if (
      await page
        .getByRole("button", { name: "Remove latte from notebook" })
        .count()
    )
      throw Error("Word removal failed");
    await nav("Speak").click();
    await page.locator("button.flow-card").first().waitFor();
    await shot("18-speak-scenarios");
    await page.locator("button.flow-card").first().click();
    await shot("19-speak-context");
    await page.getByRole("button", { name: "Start conversation →" }).click();
    await page.getByRole("button", { name: "🎙 Voice preview" }).click();
    await page
      .getByText("Microphone off. Type a reply to explore this screen.")
      .waitFor();
    await shot("20-listening-preview");
    await page.getByRole("button", { name: "Finish preview" }).click();
    await page
      .getByRole("textbox", { name: "Your conversation reply" })
      .fill("Something different");
    await page
      .getByRole("button", { name: "Check reply", exact: true })
      .click();
    await page.getByText(/Your answer hasn’t been marked wrong/).waitFor();
    await page.locator("button.flow-choice").first().click();
    await page.getByRole("button", { name: "Save to Phrase Bank" }).click();
    await shot("21-authored-feedback");
    await page.getByRole("button", { name: "Continue →", exact: true }).click();
    if (
      await page
        .getByRole("button", { name: "Continue →", exact: true })
        .count()
    ) {
      await page.locator("button.flow-choice").first().click();
      await page
        .getByRole("button", { name: "Continue →", exact: true })
        .click();
    }
    await page
      .getByRole("heading", { name: "A little practice. A step forward." })
      .waitFor();
    await shot("22-practice-complete");
    await page.getByRole("link", { name: "Open your notebook" }).click();
    await page
      .getByRole("button", { name: "Remove from Phrase Bank" })
      .waitFor();
    await shot("23-phrases");
    await nav("Home").click();
    await completeReturningSplash();
    await page.getByRole("button", { name: "Open profile menu" }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
    await page.getByRole("link", { name: "I already have an account" }).click();
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByPlaceholder("you@example.com").fill("ahad@example.com");
    await page.getByRole("button", { name: "Preview recovery link" }).click();
    await page.getByText(/No email has been sent/).waitFor();
    await shot("24-recovery");
    await page.getByRole("button", { name: "Return to sign in" }).click();
    await page.getByPlaceholder("At least 8 characters").fill("PreviewOnly123");
    await page.getByRole("button", { name: "Sign in →", exact: true }).click();
    await page.getByRole("heading", { name: "Hello, Ahad." }).waitFor();
    await go("/setup");
    await page.getByRole("button", { name: /Japanese 日本語/ }).click();
    await page.getByRole("button", { name: "Continue →", exact: true }).click();
    await page.getByRole("button", { name: /N5 Building/ }).click();
    await shot("26-japanese-level");
    await page.getByRole("button", { name: "Continue →", exact: true }).click();
    await page.getByRole("button", { name: "Let’s begin →" }).click();
    await completeReturningSplash();
    await nav("Stories").click();
    await page
      .getByRole("link", { name: "Episodes", exact: true })
      .first()
      .waitFor();
    await shot("27-japanese-original-library");
    await nav("Speak").click();
    await page
      .locator("button.flow-card")
      .filter({ hasText: "Receipt?" })
      .click();
    await page.getByRole("button", { name: "Start conversation →" }).click();
    await shot("28-kenta-conversation");
    await page.locator("button.flow-choice").first().click();
    await shot("29-japanese-feedback");
    for (const viewport of [
      { width: 360, height: 780 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);
      await go("/");
      await page.getByRole("heading", { name: "Hello, Ahad." }).waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      if (overflow) throw Error("Horizontal overflow at " + viewport.width);
      await shot("25-home-" + viewport.width);
    }
    if (errors.length) throw Error(errors.join("\n"));
    const contents = await page.evaluate(() => JSON.stringify(localStorage));
    if (
      contents.includes("PreviewOnly123") ||
      contents.includes("AnotherPreview123")
    )
      throw Error("A preview password was persisted");
    console.log(
      "PASS original MVP player/library, setup, all four tabs, profile/password/recovery, preferences, notes, words, bookmarks, practice feedback, logout/return, persistence, 360/390/1440 layouts. No runtime errors. Screenshots: " +
        out,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
