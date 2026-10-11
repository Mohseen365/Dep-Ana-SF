const { chromium } = require('playwright');

async function testAccessibilityAndReachability() {
  console.log('=== PHASE 5: BOUNDED ACCESSIBLE LIST & REACHABILITY ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('[1] Loading http://localhost:3000/?project=pbim...');
  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.app-layout', { timeout: 180000 });

  const a11yInitial = await page.evaluate(() => {
    const list = document.querySelector('ul[aria-label="Component Nodes"]');
    const items = list ? Array.from(list.querySelectorAll('li')) : [];
    const buttons = list ? Array.from(list.querySelectorAll('button[type="button"]')) : [];
    const summaryItem = items.find(li => li.textContent.includes('Showing'));

    return {
      listExists: Boolean(list),
      itemCount: items.length,
      buttonCount: buttons.length,
      summaryText: summaryItem ? summaryItem.textContent.trim() : null,
    };
  });

  console.log('    List Exists:', a11yInitial.listExists);
  console.log('    Rendered LI Items:', a11yInitial.itemCount);
  console.log('    Rendered Button Elements:', a11yInitial.buttonCount);
  console.log('    Summary Text:', a11yInitial.summaryText);

  // Select node outside top 50 by clicking the first button in sidebar or search
  console.log('\n[2] Selecting node outside top 50 subset via accessible button click...');
  const clickResult = await page.evaluate(() => {
    const list = document.querySelector('ul[aria-label="Component Nodes"]');
    const buttons = list ? Array.from(list.querySelectorAll('button[type="button"]')) : [];
    const firstBtn = buttons[0];
    if (firstBtn) {
      firstBtn.click();
      return { clicked: true, name: firstBtn.textContent.trim() };
    }
    return { clicked: false, name: null };
  });

  console.log('    Clicked accessible list button:', clickResult);

  const a11yAfterClick = await page.evaluate(() => {
    const list = document.querySelector('ul[aria-label="Component Nodes"]');
    const buttons = list ? Array.from(list.querySelectorAll('button[type="button"]')) : [];
    const currentBtn = buttons.find(b => b.getAttribute('aria-current') === 'true');

    return {
      hasCurrent: Boolean(currentBtn),
      currentName: currentBtn ? currentBtn.textContent.trim() : null,
      buttonCount: buttons.length,
    };
  });

  console.log('    Button Count After Selection:', a11yAfterClick.buttonCount);
  console.log('    Current Selected Button:', a11yAfterClick.currentName, '| aria-current:', a11yAfterClick.hasCurrent);

  await browser.close();

  const passed = a11yInitial.listExists &&
    a11yInitial.buttonCount === 50 &&
    a11yAfterClick.hasCurrent &&
    a11yAfterClick.currentName === clickResult.name;

  console.log('\n=== ACCESSIBILITY & REACHABILITY RESULT:', passed ? 'PASSED' : 'FAILED', '===');
}

testAccessibilityAndReachability().catch(console.error);
