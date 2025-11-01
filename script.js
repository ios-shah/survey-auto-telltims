// script.js
const fs = require("fs");
const { chromium } = require("playwright");

(async () => {
  const surveyURL = "https://rbixm.qualtrics.com/jfe/form/YOUR_FORM_ID";
  const couponCode = "A1B2C3D4E5"; // optionally make dynamic later

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Opening survey...");
  await page.goto(surveyURL, { waitUntil: "load" });

  // Example: fill the first field with coupon
  const input = await page.$('input[id="QR~QID9"]');
  if (input) {
    await input.type(couponCode);
  }

  // ... here you could paste the rest of your Tampermonkey automation logic,
  // adapted for Playwright (clicking labels, next buttons, etc.)

  // For demonstration, pretend we got this code from survey:
  const promoCode = "TT12345";

  // --- Save promo code to index.html ---
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Telltims Promo Code</title>
    <style>
      body { font-family: Arial, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#fafafa; }
      .card { background:white; padding:30px; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.1); text-align:center; }
      h1 { color:#333; margin-bottom:10px; }
      .code { font-size:2rem; color:#d32f2f; margin-top:10px; font-weight:bold; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Your Telltims Promo Code</h1>
      <div class="code">${promoCode}</div>
      <p>Last updated: ${new Date().toLocaleString("en-CA", { timeZone: "America/Chicago" })}</p>
    </div>
  </body>
  </html>
  `;

  fs.writeFileSync("index.html", html);
  console.log("✅ Promo code saved to index.html");

  await browser.close();
})();
