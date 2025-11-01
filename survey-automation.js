const puppeteer = require('puppeteer');

// Get survey code from environment variable (set by GitHub Action)
const SURVEY_CODE = process.env.SURVEY_CODE;
const SURVEY_URL = 'https://rbixm.qualtrics.com/jfe/form/SV_3lMYn8fpUtkEu7c?CountryCode=CAN&InviteType=Coupon&SC=21';

/**
 * Executes the entire survey automation process using a headless browser.
 * @param {string} code - The survey code to input.
 */
async function runSurveyAutomation(code) {
    let browser;
    const logs = [];
    let promoCode = null;

    if (!code) {
        logs.push('[FATAL] No survey code provided.');
        return { success: false, promoCode, logs };
    }

    try {
        logs.push(`[INIT] Starting automation for code: ${code.substring(0, 5)}...`);
        
        // Launch the browser instance
        browser = await puppeteer.launch({
            // Required for GitHub Actions environment
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
            headless: true,
        });
        const page = await browser.newPage();
        
        // Set up console logging from the page to be captured
        page.on('console', (msg) => logs.push(`[Browser Log]: ${msg.text()}`));
        
        // Set user agent to mimic a regular browser
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Navigate to the survey URL
        logs.push(`[NAV] Going to URL: ${SURVEY_URL}`);
        await page.goto(SURVEY_URL, { waitUntil: 'networkidle0', timeout: 60000 });

        logs.push('[STEP 1] Entering QR code (QID9)');
        // Wait for the QR input field and type the code
        const qrInputSelector = 'input[id="QR~QID9"]';
        await page.waitForSelector(qrInputSelector, { timeout: 10000 });
        await page.type(qrInputSelector, code, { delay: 50 }); // Simulating human typing speed

        // Click Next button
        await page.click('#NextButton');
        logs.push('[STEP 1 Complete] Next button clicked.');
        
        // --- Loop through pages to automate common highly satisfied steps ---
        
        let step = 2;
        const maxSteps = 25; 

        while (step < maxSteps) {
            try {
                // Wait for the Next button to appear on the new page
                await page.waitForSelector('#NextButton', { timeout: 5000 });

                const url = page.url();
                
                // Example check for specific question IDs
                if (url.includes('QID14')) { // Example: QID14 - Select 'Yes'
                    logs.push(`[STEP ${step}] Automating QID14 ('Yes')`);
                    await page.click('#QID14-1-label');
                } else if (url.includes('QID15')) { // Example: QID15 - Select 'Highly Satisfied'
                    logs.push(`[STEP ${step}] Automating QID15 ('Highly Satisfied')`);
                    await page.click('#QID15-4-label');
                } else if (url.includes('QID45')) { // Example: QID45 - Textarea
                    logs.push(`[STEP ${step}] Automating QID45 (Textarea)`);
                    const textArea = 'textarea[id^="QR~QID45"]';
                    await page.waitForSelector(textArea);
                    await page.type(textArea, "The quality was excellent and the service was friendly.", { delay: 20 });
                } else if (url.includes('QID151')) { // Example: QID151 - Select 'No'
                    logs.push(`[STEP ${step}] Automating QID151 ('No')`);
                    await page.click('#QR~QID151~3');
                } else if (url.includes('QID134')) { // Example: QID134 - Select 'No'
                    logs.push(`[STEP ${step}] Automating QID134 ('No')`);
                    await page.click('#QR~QID134~2');
                } else if (url.includes('QID44') || url.includes('QID59')) { 
                    // Example for Matrix: Select all 'Highly Likely' (typically value 1)
                    logs.push(`[STEP ${step}] Automating Matrix (Highly Likely/Satisfied)`);
                    const radios = await page.$$('label[for$="~1"]');
                    for (const radio of radios) {
                        await radio.click();
                    }
                } else {
                    logs.push(`[STEP ${step}] Unhandled question ID. Attempting to click Next anyway.`);
                }
                
                // Click the Next button
                await page.click('#NextButton');
                logs.push(`[STEP ${step} Complete] Next button clicked.`);
                step++;

            } catch (e) {
                // Check if we hit the end of survey (End of Survey div appears)
                const endOfSurvey = await page.$('#EndOfSurvey');
                if (endOfSurvey) {
                    logs.push('[FINAL] End of survey reached.');
                    // Attempt to extract the promo code from the final page text
                    promoCode = await page.evaluate(() => {
                        const endDiv = document.getElementById('EndOfSurvey');
                        if (endDiv) {
                            // Search for "Validation Code:" or similar pattern
                            const strongTags = endDiv.getElementsByTagName('strong');
                            for (let s of strongTags) {
                                if (s.textContent.toLowerCase().includes('code')) {
                                    return s.textContent.split(':').pop().trim();
                                }
                            }
                        }
                        return 'PROMO_CODE_NOT_FOUND_IN_ELEMENT';
                    });
                    
                    logs.push(`[RESULT] Final Promo Code Extracted: ${promoCode}`);
                    await browser.close();
                    return { success: true, promoCode, logs };
                }
                
                // If the Next button or a required element wasn't found, log the error and break
                logs.push(`[ERROR] Automation failed on step ${step}. Element not found or timed out.`);
                logs.push(`[ERROR DETAILS] ${e.message}`);
                break;
            }
        }

        await browser.close();
        return { success: false, promoCode: 'N/A', logs: logs };

    } catch (e) {
        logs.push(`[FATAL ERROR] Puppeteer crash: ${e.message}`);
        if (browser) await browser.close();
        return { success: false, promoCode: 'N/A', logs: logs };
    }
}

// Execute the main function and print structured results to stdout
runSurveyAutomation(SURVEY_CODE)
    .then(result => {
        // Output results in JSON format for the GitHub Action to parse
        console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
        console.error(JSON.stringify({ success: false, promoCode: 'N/A', logs: ['Fatal script error: ' + error.message] }));
    });
