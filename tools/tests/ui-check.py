# Snabb renderingskoll av sektionen "Blodsocker & mat" med Playwright (Python).
#   python tools/tests/ui-check.py http://localhost:5247 out.png
# Skriver ut vilka nyckeltexter som finns på sidan och tar en skärmdump av sektionen.
import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5247"
shot = sys.argv[2] if len(sys.argv) > 2 else None

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1280, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(url, wait_until="networkidle")
    page.wait_for_selector("#blodsocker", timeout=20000)
    sec = page.locator("#blodsocker")
    text = sec.inner_text()
    for needle in ["Blodsocker & mat", "Beslutsstöd", "Senaste dygnen", "Måltider", "SYNTETISK", "för lite insulin", "för mycket insulin", "Inga dygn inlästa"]:
        print(f"{'OK ' if needle in text else '-- '} {needle}")
    print("meal rows:", sec.locator("img, svg[aria-label='Blodsocker efter måltiden']").count())
    print("nav has Blodsocker:", page.locator("nav").inner_text().find("Blodsocker") >= 0)
    print("page errors:", errors or "none")
    if shot:
        sec.screenshot(path=shot)
        print("screenshot:", shot)
    b.close()
