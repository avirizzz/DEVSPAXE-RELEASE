import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/dashboard');
  
  // wait for react to render
  await page.waitForTimeout(2000);
  
  // let's click the settings button
  await page.evaluate(() => {
    localStorage.setItem('app_theme', 'blue');
    // force reload to apply
  });
  await page.reload();
  await page.waitForTimeout(2000);
  
  // check what the variable is on HTML
  const cssVar = await page.evaluate(() => document.documentElement.style.getPropertyValue('--color-primary'));
  console.log('HTML --color-primary:', cssVar);
  
  // get the computed style of something with bg-primary
  const computedBg = await page.evaluate(() => {
    // create a temp element
    const div = document.createElement('div');
    div.className = 'bg-primary';
    document.body.appendChild(div);
    const color = window.getComputedStyle(div).backgroundColor;
    div.remove();
    return color;
  });
  console.log('Computed bg-primary:', computedBg);
  
  await browser.close();
})();
