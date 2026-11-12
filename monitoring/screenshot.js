// Render an HTML report card to a JPEG, full-page, fixed width.
// Usage: node screenshot.js <input.html> <output.jpg>
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const [, , inputHtml, outputJpg] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 800 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(inputHtml));
  await page.waitForTimeout(300);
  await page.screenshot({ path: outputJpg, type: 'jpeg', quality: 92, fullPage: true });
  await browser.close();
})();
