import asyncio
import json
import time
from playwright.async_api import async_playwright

DATASETS = [
    ("audit-fixtures_cloud-spend-tracker", "cst", "http://localhost:5173/?project=cst"),
    ("analyze_bqc", "bqc", "http://localhost:5173/?project=bqc"),
    ("analyze_cloud-spend-tracker", "cloud-spend-tracker", "http://localhost:5173/?project=cloud-spend-tracker"),
    ("analyze_cst", "cst", "http://localhost:5173/?project=cst"),
    ("analyze_pub-infra-mang", "pub-infra-mang", "http://localhost:5173/?project=pub-infra-mang"),
    ("public_bqc", "bqc", "http://localhost:5173/?project=bqc"),
    ("public_cloud-spend-tracker", "cloud-spend-tracker", "http://localhost:5173/?project=cloud-spend-tracker"),
    ("public_cst", "cst", "http://localhost:5173/?project=cst"),
    ("public_movie", "movie", "http://localhost:5173/?project=movie"),
    ("public_pub-infra-mang", "pub-infra-mang", "http://localhost:5173/?project=pub-infra-mang"),
]

MODES = [
    "graph",
    "dashboard",
    "matrix",
    "heatmap",
    "river",
    "tree",
    "treemap",
    "subway",
    "constellation",
    "profile",
    "radar",
    "dna",
    "four-direction",
    "findings",
    "hotspots",
    "diagnostics",
    "compare",
    "history",
]

async def run_verification():
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir="/home/jules/verification/videos"
        )
        page = await context.new_page()

        console_logs = []
        page_errors = []
        network_errors = []

        page.on("console", lambda msg: console_logs.append({"type": msg.type, "text": msg.text, "location": msg.location}))
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        page.on("requestfailed", lambda req: network_errors.append({"url": req.url, "failure": req.failure}))

        for dataset_label, project_id, url in DATASETS:
            print(f"================ DATASET: {dataset_label} ({project_id}) ================")

            # Reset logs per dataset
            console_logs.clear()
            page_errors.clear()
            network_errors.clear()

            t0 = time.time()
            try:
                await page.goto(url, wait_until="networkidle", timeout=10000)
            except Exception as e:
                print(f"Page load error for {url}: {e}")

            await page.wait_for_timeout(1000)
            load_latency_ms = round((time.time() - t0) * 1000)

            # Record baseline initial graph
            graph_baseline_text = ""
            try:
                # Capture node/edge text from header or info pill if available
                header_text = await page.inner_text("body")
                graph_baseline_text = header_text[:200].replace("\n", " ")
            except Exception as e:
                graph_baseline_text = f"Error reading header: {e}"

            for mode in MODES:
                print(f"  --> Testing mode: {mode}")
                mode_t0 = time.time()

                btn_test_id = f"view-btn-{mode}"
                load_status = "PASS"
                render_status = "PASS"
                interaction_status = "PASS"
                nav_status = "PASS"
                obs = []

                # Clear error buffers for mode check
                mode_console_errors = []
                mode_page_errors = []

                try:
                    # Click mode button in ViewModeSwitcher
                    btn = page.locator(f'[data-testid="{btn_test_id}"]')
                    if await btn.count() > 0:
                        await btn.click()
                        await page.wait_for_timeout(800)
                    else:
                        load_status = "FAIL"
                        obs.append(f"Button data-testid={btn_test_id} not found")

                    mode_render_time_ms = round((time.time() - mode_t0) * 1000)

                    # Inspect errors during mode activation
                    for cl in console_logs:
                        if cl["type"] == "error":
                            mode_console_errors.append(cl["text"])
                    for pe in page_errors:
                        mode_page_errors.append(pe)

                    # Check for blank screen / unexpected crashes
                    body_html = await page.content()
                    if "An unexpected error has occurred" in body_html or "Uncaught Error" in body_html:
                        render_status = "FAIL"
                        obs.append("Uncaught error boundary rendered")

                    # Mode specific interaction check
                    if mode == "graph":
                        # Try pan/zoom or search
                        search_input = page.locator('input[placeholder*="Search"]')
                        if await search_input.count() > 0:
                            await search_input.fill("Account")
                            await page.wait_for_timeout(300)
                            await search_input.fill("")
                    elif mode == "matrix":
                        # Look for matrix cells
                        matrix_cells = page.locator(".matrix-cell")
                        if await matrix_cells.count() == 0:
                            obs.append("Matrix cells count is 0")
                    elif mode == "subway":
                        # Check subway canvas/lines
                        subway_lines = page.locator(".subway-line, canvas, svg")
                        if await subway_lines.count() == 0:
                            obs.append("No subway canvas/SVG elements found")
                    elif mode == "river":
                        sankey_nodes = page.locator(".sankey-node, path")
                        if await sankey_nodes.count() == 0:
                            obs.append("No sankey nodes/paths found")

                    # Return to Graph Navigation check
                    graph_btn = page.locator('[data-testid="view-btn-graph"]')
                    if await graph_btn.count() > 0:
                        await graph_btn.click()
                        await page.wait_for_timeout(500)
                    else:
                        nav_status = "FAIL"
                        obs.append("Return to graph button not found")

                    # Screenshot per dataset x mode (for audit evidence)
                    screenshot_path = f"/home/jules/verification/screenshots/{dataset_label}_{mode}.png"
                    await page.screenshot(path=screenshot_path)

                    final_comb_status = "PASS"
                    if load_status == "FAIL" or render_status == "FAIL" or len(mode_page_errors) > 0:
                        final_comb_status = "FAIL"
                    elif len(mode_console_errors) > 0 or len(obs) > 0:
                        final_comb_status = "PASS WITH OBSERVATION"

                    results.append({
                        "dataset": dataset_label,
                        "projectId": project_id,
                        "mode": mode,
                        "loadStatus": load_status,
                        "renderStatus": render_status,
                        "interactionStatus": interaction_status,
                        "navStatus": nav_status,
                        "renderTimeMs": mode_render_time_ms,
                        "consoleErrorCount": len(mode_console_errors),
                        "pageErrorCount": len(mode_page_errors),
                        "consoleErrors": mode_console_errors[:3],
                        "pageErrors": mode_page_errors[:3],
                        "observations": obs,
                        "screenshot": screenshot_path,
                        "status": final_comb_status
                    })

                except Exception as ex:
                    print(f"Error testing {dataset_label} mode {mode}: {ex}")
                    results.append({
                        "dataset": dataset_label,
                        "projectId": project_id,
                        "mode": mode,
                        "loadStatus": "FAIL",
                        "renderStatus": "FAIL",
                        "interactionStatus": "FAIL",
                        "navStatus": "FAIL",
                        "renderTimeMs": round((time.time() - mode_t0) * 1000),
                        "consoleErrorCount": len(mode_console_errors),
                        "pageErrorCount": len(mode_page_errors),
                        "consoleErrors": mode_console_errors,
                        "pageErrors": mode_page_errors,
                        "observations": [str(ex)],
                        "screenshot": "",
                        "status": "FAIL"
                    })

        await context.close()
        await browser.close()

    with open("/home/jules/verification/results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"Verification complete! Total entries: {len(results)}")

if __name__ == "__main__":
    asyncio.run(run_verification())
