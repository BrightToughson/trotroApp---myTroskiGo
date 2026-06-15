const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        
        // Capture console messages
        page.on('console', msg => {
            console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
        });

        // Capture page errors (unhandled exceptions)
        page.on('pageerror', err => {
            console.error(`[BROWSER ERROR] Unhandled Exception:`, err.toString());
        });

        console.log("Navigating to local expo web server...");
        await page.goto('http://localhost:8081', { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log("Page loaded. Waiting for 5 seconds to catch delayed errors...");
        await new Promise(r => setTimeout(r, 5000));

        await browser.close();
        console.log("Browser closed.");
        process.exit(0);
    } catch (e) {
        console.error("Puppeteer script failed:", e);
        process.exit(1);
    }
})();
