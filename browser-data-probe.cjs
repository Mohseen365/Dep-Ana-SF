const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("request", request => {
    if (/manifest\.json|explorer-data\.json|project-metadata\.json/.test(request.url())) {
      console.log("REQUEST:", request.method(), request.url());
    }
  });

  page.on("response", response => {
    if (/manifest\.json|explorer-data\.json|project-metadata\.json/.test(response.url())) {
      console.log("RESPONSE:", response.status(), response.url());
    }
  });

  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle"
  });

  console.log("ACTIVE PROJECT:", await page.evaluate(() =>
    localStorage.getItem("explorer.activeProjectId")
  ));

  console.log("CYTOSCAPE INSTANCE:", await page.evaluate(() => {
    const cy = window.__CY__;
    return cy ? {
      nodeCount: cy.nodes().length,
      edgeCount: cy.edges().length,
      nodeIds: cy.nodes().map(node => node.id())
    } : null;
  }));

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
