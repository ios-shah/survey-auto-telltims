// script.js
const fs = require("fs");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Opening Wikipedia...");
  await page.goto("https://en.wikipedia.org/wiki/Canada", { waitUntil: "load" });

  // Extract the first paragraph
  const firstParagraph = await page.$eval("p", (el) => el.innerText);

  // Create a simple HTML page
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wikipedia Fetcher</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 700px; margin: 80px auto; line-height: 1.6; }
      h1 { color: #2a4d9b; }
      p { font-size: 1.1rem; }
      .time { color: gray; font-size: 0.9rem; margin-top: 20px; }
    </style>
  </head>
  <body>
    <h1>Wikipedia Summary: Canada</h1>
    <p>${firstParagraph}</p>
    <div class="time">Last updated: ${new Date().toLocaleString("en-CA", { timeZone: "America/Chicago" })}</div>
  </body>
  </html>
  `;

  fs.writeFileSync("index.html", html);
  console.log("✅ Wikipedia data saved to index.html");

  await browser.close();
})();
