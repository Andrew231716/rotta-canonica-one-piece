"""Sanji/Chopper fill cards; last character cards clear the mobile nav."""
from playwright.sync_api import sync_playwright
import os

chrome = next((p for p in ("/usr/bin/google-chrome", "/usr/bin/chromium") if os.path.exists(p)), None)
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, executable_path=chrome, args=["--no-sandbox", "--disable-dev-shm-usage"])
    page = b.new_page(viewport={"width": 390, "height": 844}, service_workers="block")
    page.goto("http://127.0.0.1:8765/", wait_until="networkidle", timeout=30000)
    page.evaluate("()=>{try{localStorage.clear()}catch(e){} extra.spoiler=false;saveExtra();setTab('characters')}")
    page.wait_for_function(
        "()=>document.querySelector(\".char-card[data-id=sanji] .character-portrait\")?.naturalWidth>0",
        timeout=10000,
    )
    for cid in ("sanji", "chopper", "nami", "usopp"):
        fill = page.evaluate(
            f"""()=>{{
            const card=document.querySelector('.char-card[data-id="{cid}"]');
            const art=card.querySelector('.char-art').getBoundingClientRect();
            const img=card.querySelector('.character-portrait').getBoundingClientRect();
            return Math.round(img.width/art.width*100);
        }}"""
        )
        assert fill >= 98, (cid, fill)
        print(cid, "fill", fill, "PASS", flush=True)
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(120)
    end = page.evaluate(
        """()=>{
      const nav=document.querySelector('.mobile-nav').getBoundingClientRect();
      const last=[...document.querySelectorAll('.char-card')].at(-1).getBoundingClientRect();
      return {cleared: last.bottom <= nav.top - 2, lastBottom: Math.round(last.bottom), navTop: Math.round(nav.top)};
    }"""
    )
    assert end["cleared"], end
    print("nav clearance PASS", end, flush=True)
    page.evaluate("setTab('more')")
    page.wait_for_timeout(80)
    heights = page.evaluate(
        "()=>[...document.querySelectorAll('.mobile-nav button')].map(b=>Math.round(b.getBoundingClientRect().height))"
    )
    assert max(heights) - min(heights) <= 6, heights
    print("nav heights PASS", heights, flush=True)
    b.close()
    print("chars layout PASS", flush=True)
