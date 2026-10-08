import asyncio
import json
import os
import subprocess
import time
from playwright.async_api import async_playwright

async def run():
    p_server = None
    try:
        proc = subprocess.run(['lsof', '-i', ':3000'], capture_output=True)
        if proc.returncode != 0:
            print('Starting Vite server on port 3000...')
            env = dict(os.environ)
            env['PATH'] = '/home/jules/.npm/_npx/69c381f8ad94b576/node_modules/.bin:' + env.get('PATH', '')
            p_server = subprocess.Popen(
                ['npx', 'vite', '--port', '3000', '--host', '127.0.0.1'],
                cwd='explorer',
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            for i in range(15):
                await asyncio.sleep(1)
                p2 = subprocess.run(['lsof', '-i', ':3000'], capture_output=True)
                if p2.returncode == 0:
                    print('Vite server up and listening on port 3000!')
                    break
        else:
            print('Vite server port 3000 running.')

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(viewport={'width': 1280, 'height': 800})
            page = await context.new_page()

            # Log page errors
            page.on('console', lambda msg: print(f'CONSOLE [{msg.type}]: {msg.text}') if msg.type in ['error'] else None)
            page.on('pageerror', lambda err: print(f'PAGE ERROR: {err}'))

            # Pre-seed localStorage to constellation mode & static mode
            await page.add_init_script('''
                const key = "explorer.projectState.pbim";
                let state = {};
                try { state = JSON.parse(localStorage.getItem(key) || "{}"); } catch(e){}
                state.graphLayout = state.graphLayout || {};
                state.graphLayout.architectureMode = "constellation";
                state.graphLayout.mode = "static";
                localStorage.setItem(key, JSON.stringify(state));
            ''')

            # Navigate to explorer
            await page.goto('http://127.0.0.1:3000/?project=pbim', wait_until='domcontentloaded')

            ready = False
            for i in range(30):
                ready = await page.evaluate('''() => {
                    const cy = window.__CY__;
                    return Boolean(cy && typeof cy.nodes === "function" && cy.nodes().length === 528);
                }''')
                if ready: break
                await asyncio.sleep(0.5)

            print('App ready in browser:', ready)

            # 1. Node 1: LWC:asset-dashboard-container initial state
            initial_data = await page.evaluate('''() => {
                const cy = window.__CY__;
                const node = cy.getElementById("LWC:asset-dashboard-container");
                const pos = node.position();
                const stored = JSON.parse(localStorage.getItem("explorer.projectState.pbim") || "{}");
                return {
                    pos: { x: Math.round(pos.x), y: Math.round(pos.y) },
                    mode: stored.graphLayout?.mode,
                    architectureMode: stored.graphLayout?.architectureMode,
                    layoutProvenance: stored.graphLayout?.layoutProvenance,
                    visibleCount: cy.nodes().filter(n => n.visible()).length,
                    edgeCount: cy.edges().filter(e => e.visible()).length,
                };
            }''')
            print('1. Initial Data (Static Constellation):', json.dumps(initial_data, indent=2))

            # 2. Simulate User Drag on LWC:asset-dashboard-container to (1400, 500)
            await page.evaluate('''() => {
                const cy = window.__CY__;
                const node = cy.getElementById("LWC:asset-dashboard-container");
                node.position({ x: 1400, y: 500 });
                node.emit("dragfree");
            }''')

            after_drag = await page.evaluate('''() => {
                const cy = window.__CY__;
                const node = cy.getElementById("LWC:asset-dashboard-container");
                const pos = node.position();
                const stored = JSON.parse(localStorage.getItem("explorer.projectState.pbim") || "{}");
                return {
                    pos: { x: Math.round(pos.x), y: Math.round(pos.y) },
                    mode: stored.graphLayout?.mode,
                    architectureMode: stored.graphLayout?.architectureMode,
                    layoutProvenance: stored.graphLayout?.layoutProvenance,
                    storedNodePos: stored.graphLayout?.nodePositions?.["LWC:asset-dashboard-container"],
                };
            }''')
            print('2. After Drag:', json.dumps(after_drag, indent=2))

            # 3. Static Sync (Selection Change)
            await page.evaluate('''() => {
                const cy = window.__CY__;
                const n2 = cy.getElementById("LWC:vendor-workspace");
                n2.select();
            }''')
            after_sync = await page.evaluate('''() => {
                const cy = window.__CY__;
                const node = cy.getElementById("LWC:asset-dashboard-container");
                const pos = node.position();
                const stored = JSON.parse(localStorage.getItem("explorer.projectState.pbim") || "{}");
                return {
                    pos: { x: Math.round(pos.x), y: Math.round(pos.y) },
                    mode: stored.graphLayout?.mode,
                    architectureMode: stored.graphLayout?.architectureMode,
                    layoutProvenance: stored.graphLayout?.layoutProvenance,
                };
            }''')
            print('3. After Static Sync (Selection Change):', json.dumps(after_sync, indent=2))

            # 4. Static -> Interactive Transition via UI button click
            await page.click('button[aria-label*="Switch to Interactive Layout"]')
            await asyncio.sleep(0.5)

            after_toggle_interactive = await page.evaluate('''() => {
                const cy = window.__CY__;
                const node = cy.getElementById("LWC:asset-dashboard-container");
                const pos = node.position();
                const stored = JSON.parse(localStorage.getItem("explorer.projectState.pbim") || "{}");
                return {
                    pos: { x: Math.round(pos.x), y: Math.round(pos.y) },
                    mode: stored.graphLayout?.mode,
                    architectureMode: stored.graphLayout?.architectureMode,
                    layoutProvenance: stored.graphLayout?.layoutProvenance,
                };
            }''')
            print('4. After Toggle to Interactive:', json.dumps(after_toggle_interactive, indent=2))

            # 5. Interactive -> Static Transition via UI button click
            await page.click('button[aria-label*="Switch to Static Layout"]')
            await asyncio.sleep(0.5)

            after_toggle_static = await page.evaluate('''() => {
                const cy = window.__CY__;
                const node = cy.getElementById("LWC:asset-dashboard-container");
                const pos = node.position();
                const stored = JSON.parse(localStorage.getItem("explorer.projectState.pbim") || "{}");
                return {
                    pos: { x: Math.round(pos.x), y: Math.round(pos.y) },
                    mode: stored.graphLayout?.mode,
                    architectureMode: stored.graphLayout?.architectureMode,
                    layoutProvenance: stored.graphLayout?.layoutProvenance,
                };
            }''')
            print('5. After Toggle back to Static:', json.dumps(after_toggle_static, indent=2))

            # 6. 10-Cycle Toggle Test
            cycle_results = []
            for cycle in range(1, 11):
                # Static -> Interactive
                await page.click('button[aria-label*="Switch to Interactive Layout"]')
                await asyncio.sleep(0.15)
                # Interactive -> Static
                await page.click('button[aria-label*="Switch to Static Layout"]')
                await asyncio.sleep(0.15)

                res = await page.evaluate('''() => {
                    const cy = window.__CY__;
                    const node = cy.getElementById("LWC:asset-dashboard-container");
                    const pos = node.position();
                    const visNodes = cy.nodes().filter(n => n.visible());
                    const visEdges = cy.edges().filter(e => e.visible());
                    return {
                        pos: { x: Math.round(pos.x), y: Math.round(pos.y) },
                        visNodesCount: visNodes.length,
                        visEdgesCount: visEdges.length,
                    };
                }''')
                cycle_results.append(res)

            print('6. 10-Cycle Toggle Results (Cycle 1 & 10):', json.dumps([cycle_results[0], cycle_results[-1]], indent=2))

            # 7. Test Node 2: LWC:vendor-workspace drag & toggle
            vendor_drag = await page.evaluate('''() => {
                const cy = window.__CY__;
                const node = cy.getElementById("LWC:vendor-workspace");
                const initialPos = node.position();
                node.position({ x: 2500, y: 800 });
                node.emit("dragfree");
                return { initial: { x: Math.round(initialPos.x), y: Math.round(initialPos.y) } };
            }''')
            print('7. Vendor Workspace Initial:', vendor_drag)

            await page.click('button[aria-label*="Switch to Interactive Layout"]')
            await asyncio.sleep(0.2)
            await page.click('button[aria-label*="Switch to Static Layout"]')
            await asyncio.sleep(0.2)

            vendor_after_toggle = await page.evaluate('''() => {
                const cy = window.__CY__;
                const node = cy.getElementById("LWC:vendor-workspace");
                const pos = node.position();
                return { x: Math.round(pos.x), y: Math.round(pos.y) };
            }''')
            print('7. Vendor Workspace After Toggle:', vendor_after_toggle)

            # 8. Test Node 3: ApexClass:BudgetController (shared node)
            apex_drag_test = await page.evaluate('''() => {
                const cy = window.__CY__;
                const node = cy.getElementById("ApexClass:BudgetController");
                const initialPos = node.position();
                const isGrabbable = node.grabbable();
                node.position({ x: 500, y: 500 });
                node.emit("dragfree");
                const pos = node.position();
                return {
                    isGrabbable,
                    initial: { x: Math.round(initialPos.x), y: Math.round(initialPos.y) },
                    afterDrag: { x: Math.round(pos.x), y: Math.round(pos.y) },
                };
            }''')
            print('8. ApexClass Drag Test:', json.dumps(apex_drag_test, indent=2))

            # 9. Secondary evidence verification: PBIM Reachability
            reachability = await page.evaluate('''() => {
                const cy = window.__CY__;
                const nodes = cy.nodes();
                const edges = cy.edges();

                const lwcIds = new Set(nodes.filter(n => n.data("type") === "LWC").map(n => n.id()));

                const adj = new Map();
                nodes.forEach(n => adj.set(n.id(), []));
                edges.forEach(e => {
                    const src = e.source().id();
                    const tgt = e.target().id();
                    if (adj.has(src)) adj.get(src).push(tgt);
                    if (adj.has(tgt)) adj.get(tgt).push(src);
                });

                const visitedAny = new Set(lwcIds);
                const queue = Array.from(lwcIds);
                while (queue.length > 0) {
                    const curr = queue.shift();
                    for (const neighbor of (adj.get(curr) || [])) {
                        if (!visitedAny.has(neighbor)) {
                            visitedAny.add(neighbor);
                            queue.push(neighbor);
                        }
                    }
                }

                let reachableAll = null;
                for (const lwcId of lwcIds) {
                    const visitedOne = new Set([lwcId]);
                    const q = [lwcId];
                    while (q.length > 0) {
                        const curr = q.shift();
                        for (const neighbor of (adj.get(curr) || [])) {
                            if (!visitedOne.has(neighbor)) {
                                visitedOne.add(neighbor);
                                q.push(neighbor);
                            }
                        }
                    }
                    if (reachableAll === null) {
                        reachableAll = visitedOne;
                    } else {
                        reachableAll = new Set([...reachableAll].filter(x => visitedOne.has(x)));
                    }
                }

                return {
                    totalNodes: nodes.length,
                    lwcCount: lwcIds.size,
                    reachableFromAnyLwc: visitedAny.size,
                    unreachableFromAnyLwc: nodes.length - visitedAny.size,
                    reachableFromAllLwcs: reachableAll ? reachableAll.size : 0,
                    unreachableFromAllLwcs: nodes.length - (reachableAll ? reachableAll.size : 0),
                };
            }''')
            print('9. PBIM Reachability Analysis:', json.dumps(reachability, indent=2))

            # 10. Secondary evidence verification: Architecture Orbit Mode projections across focal LWCs
            orbit_baselines = {}
            for focal_id in ['LWC:asset-dashboard-container', 'LWC:vendor-workspace', 'LWC:citizen-report-portal', 'LWC:error-panel']:
                res = await page.evaluate('''({ focalId }) => {
                    const cy = window.__CY__;
                    const layoutModule = window.__LAYOUT_MODULE__;
                    const orbitRes = layoutModule.runLayoutWithMetadata(cy, {
                        architectureMode: "orbit",
                        focalLwcId: focalId,
                        fit: true,
                    });
                    const visNodes = cy.nodes().filter(n => n.visible());
                    const visEdges = cy.edges().filter(e => e.visible());
                    return {
                        projectedCount: orbitRes.projectedNodeIds ? orbitRes.projectedNodeIds.size : 0,
                        renderedVisNodes: visNodes.length,
                        renderedVisEdges: visEdges.length,
                        totalCyNodes: cy.nodes().length,
                    };
                }''', {'focalId': focal_id})
                orbit_baselines[focal_id] = res

            print('10. Architecture Orbit Focal Baselines:', json.dumps(orbit_baselines, indent=2))

            await browser.close()
    finally:
        if p_server:
            p_server.terminate()

asyncio.run(run())
