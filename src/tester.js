import fs from 'fs';
import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import esMain from 'es-main';

const profiles = [
  'Andrea-Tang/California/Arcadia/p28916864141',
  // 'John-Smith/Florida/Lake-Wales/p2059714461',
  // 'John-Smith/Tennessee/Dyersburg/p2053364171',
  // 'Richard-Smith/Arizona/Roosevelt/p1198098701',
  // 'John-Smith/Florida/Deerfield-Beach/p1421535931',
  // 'John-Smith/Pennsylvania/Wexford/p2017022513021738513113821307287',
  // 'John-Smith/Massachusetts/Stoneham/p3443319451',
  // 'Mike-Chan/California/Rancho-Palos-Verdes/p1388622501',
  // 'Billy-Joe/Texas/Desoto/p85964761',
  // 'Taylor-Swift/Washington/Bainbridge-Island/p40415976242',
];

// This port will be used by Lighthouse later. The specific port is arbitrary.
const PORT = 8041;
const CHARLIE_URL = 'https://charlie.spokeo.com';
const QA_URL = 'https://qa.spokeo.com';

/**
 * Login to spokeo
 * @param browser
 * @param origin
 * @param username
 * @param password
 */
async function login({ browser, origin, username, password }) {
  const page = await browser.newPage();
  await page.goto(`${origin}/login`);
  await page.waitForSelector('#email_address', { visible: true });

  // Fill in and submit login form.
  const emailInput = await page.$('#email_address');
  await emailInput.type(username);
  const passwordInput = await page.$('#password');
  await passwordInput.type(password);
  const submitButton = await page.$('.session_button[type="submit"]');
  await submitButton.click();
  await page.waitForNavigation();

  await page.close();
}

/**
 * @param {puppeteer.Browser} browser
 * @param {string} origin
 */
async function logout(browser, origin) {
  const page = await browser.newPage();
  await page.goto(`${origin}/logout`);
  await page.close();
}

const visitProfile = async (origin, path, type) => {
  const result = await lighthouse(`${origin}/${path}`, {
    port: PORT,
    disableStorageReset: true,
    emulatedUserAgent: 'chrome',
    output: 'html',
  });

  const paths = path.split('/');
  const name = paths[0];
  const pid = paths[paths.length - 1];

  // `.report` is the HTML report as a string
  const reportHtml = result.report;
  fs.writeFileSync(`./reports/${type}-${name}-${pid}.html`, reportHtml);
};

async function generateOPNPReports() {
  const browser = await puppeteer.launch({
    args: [`--remote-debugging-port=${PORT}`, '--window-size=1200,800'],
    headless: false,
  });

  await login({
    browser,
    origin: CHARLIE_URL,
    username: '463a88c431e6@spokeo.com',
    password: '463a88c431e6@spokeo.com',
  });

  // new name profiles
  for (const profile of profiles) {
    await visitProfile(CHARLIE_URL, profile, 'OPNP');
  }

  await browser.close();
}

async function generateTPReports() {
  const browser = await puppeteer.launch({
    args: [`--remote-debugging-port=${PORT}`, '--window-size=1200,800'],
    headless: false,
  });

  await login({
    browser,
    origin: QA_URL,
    username: '463a88c431e6@spokeo.com',
    password: '463a88c431e6@spokeo.com',
  });
  // text profiles
  for (const profile of profiles) {
    const paths = profile.split('/');
    const pid = paths[paths.length - 1];
    const tid = pid.replace('p', 't');
    const path = [...paths.slice(0, paths.length - 1), tid].join('/');
    await visitProfile(QA_URL, path, 'TP');
  }

  await browser.close();
}

if (esMain(import.meta)) {
  generateOPNPReports();
}

export { login, logout };
