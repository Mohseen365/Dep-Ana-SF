from playwright.sync_api import sync_playwright
import time

def run_matrix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000/?project=pbim", timeout=60000)
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        def click_arch():
            page.evaluate('() => document.querySelector("[data-testid=\\"architecture-mode-toggle\\"]")?.click()')
            time.sleep(0.5)

        def click_mode():
            page.evaluate('() => document.querySelector("[data-testid=\\"layout-mode-toggle\\"]")?.click()')
            time.sleep(0.5)

        # 1. Hierarchical Interactive
        print("Hierarchical Interactive:")
        print("  Badge:", page.evaluate('() => document.querySelector("[data-testid=\\"graph-mode-indicator\\"]").textContent'))

        # Select node
        page.evaluate('() => window.__CY__.getElementById("LWC:asset-dashboard-container").select()')
        print("  Selected:", page.evaluate('() => window.__CY__.nodes(":selected")[0]?.id()'))

        # Test Drag in Hierarchical Interactive
        pos0 = page.evaluate('() => window.__CY__.getElementById("LWC:asset-dashboard-container").position()')
        page.evaluate('() => window.__CY__.getElementById("LWC:asset-dashboard-container").position({x: pos0.x + 50, y: pos0.y + 50})')
        pos1 = page.evaluate('() => window.__CY__.getElementById("LWC:asset-dashboard-container").position()')
        print("  Drag pos change:", pos0, "->", pos1)

        # Test Pan & Zoom
        pan0 = page.evaluate('() => window.__CY__.pan()')
        page.evaluate('() => window.__CY__.panBy({x: 10, y: 10})')
        pan1 = page.evaluate('() => window.__CY__.pan()')
        print("  Pan change:", pan0, "->", pan1)

        # 2. Hierarchical Static
        click_mode()
        print("\nHierarchical Static:")
        print("  Badge:", page.evaluate('() => document.querySelector("[data-testid=\\"graph-mode-indicator\\"]").textContent'))

        # Test Drag in Hierarchical Static
        page.evaluate('() => window.__CY__.getElementById("LWC:asset-dashboard-container").position({x: pos1.x + 50, y: pos1.y + 50})')
        pos2 = page.evaluate('() => window.__CY__.getElementById("LWC:asset-dashboard-container").position()')
        print("  Drag pos change in Static:", pos1, "->", pos2)

        browser.close()

run_matrix()
rm run_detailed_matrix.py
