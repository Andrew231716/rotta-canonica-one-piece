"""v29.1 — bottom navigation must stay viewport-fixed while scrolling."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


def main():
    chrome = '/usr/bin/google-chrome' if Path('/usr/bin/google-chrome').exists() else '/usr/bin/chromium'
    # Prefer live local server if available; else inline bundle.
    url = 'http://127.0.0.1:8766/'
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=chrome, args=['--no-sandbox', '--disable-dev-shm-usage'])
        for width, height in ((320, 720), (390, 844), (430, 932)):
            page = browser.new_page(viewport={'width': width, 'height': height})
            try:
                page.goto(url, wait_until='networkidle', timeout=8000)
            except Exception:
                # Fallback: no server — skip network assets, still validate CSS cascade via file:// is weak;
                # require server for this test.
                raise AssertionError('Local server required at 127.0.0.1:8766 for fixed-nav test')
            page.evaluate("setTab('characters')")
            page.wait_for_timeout(150)
            base = page.evaluate(
                """() => {
                  const nav = document.querySelector('.mobile-nav');
                  const cs = getComputedStyle(nav);
                  const r = nav.getBoundingClientRect();
                  const main = document.querySelector('.main');
                  const pb = parseFloat(getComputedStyle(main).paddingBottom) || 0;
                  return {
                    position: cs.position,
                    left: cs.left,
                    right: cs.right,
                    bottom: cs.bottom,
                    zIndex: cs.zIndex,
                    top: Math.round(r.top),
                    bottomEdge: Math.round(r.bottom),
                    height: Math.round(r.height),
                    vh: window.innerHeight,
                    paddingBottom: pb,
                    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
                  };
                }"""
            )
            assert base['position'] == 'fixed', (width, base)
            assert base['bottomEdge'] >= base['vh'] - 2, (width, base)
            assert abs(base['bottomEdge'] - base['vh']) <= 2, (width, base)
            assert base['paddingBottom'] >= 80, base
            assert not base['overflow'], base

            page.evaluate('window.scrollTo(0, Math.max(0, document.body.scrollHeight - 400))')
            page.wait_for_timeout(120)
            scrolled = page.evaluate(
                """() => {
                  const r = document.querySelector('.mobile-nav').getBoundingClientRect();
                  return {
                    position: getComputedStyle(document.querySelector('.mobile-nav')).position,
                    top: Math.round(r.top),
                    bottom: Math.round(r.bottom),
                    vh: window.innerHeight,
                    scrollY: window.scrollY,
                  };
                }"""
            )
            assert scrolled['position'] == 'fixed', (width, scrolled)
            assert abs(scrolled['bottom'] - scrolled['vh']) <= 2, (width, scrolled)
            assert scrolled['scrollY'] > 50, scrolled

            page.evaluate('window.scrollTo(0, 0)')
            page.wait_for_timeout(80)
            for tab in ('path', 'episodes', 'map', 'recover', 'more', 'characters', 'journal', 'settings'):
                page.evaluate(f"setTab('{tab}')")
                page.wait_for_timeout(60)
                page.evaluate('window.scrollTo(0, 600)')
                page.wait_for_timeout(60)
                pos = page.evaluate(
                    """() => {
                      const r = document.querySelector('.mobile-nav').getBoundingClientRect();
                      return {
                        position: getComputedStyle(document.querySelector('.mobile-nav')).position,
                        bottom: Math.round(r.bottom),
                        vh: window.innerHeight,
                      };
                    }"""
                )
                assert pos['position'] == 'fixed', (tab, width, pos)
                assert abs(pos['bottom'] - pos['vh']) <= 2, (tab, width, pos)

            # Modal should not leave nav stuck incorrectly; dossier open/close
            page.evaluate("setTab('characters'); extra.spoiler=false; if(typeof saveExtra==='function')saveExtra(); setTab('characters');")
            page.wait_for_timeout(100)
            if page.locator('.wanted-poster[data-locked="false"] .wanted-open').count():
                page.locator('.wanted-poster[data-locked="false"] .wanted-open').first.click()
                page.wait_for_timeout(100)
                if page.locator('[data-action="modal-cancel"]').count():
                    page.locator('[data-action="modal-cancel"]').click()
                    page.wait_for_timeout(80)
                pos = page.evaluate(
                    """() => {
                      const r = document.querySelector('.mobile-nav').getBoundingClientRect();
                      return {position:getComputedStyle(document.querySelector('.mobile-nav')).position, bottom:Math.round(r.bottom), vh:window.innerHeight};
                    }"""
                )
                assert pos['position'] == 'fixed' and abs(pos['bottom'] - pos['vh']) <= 2

            page.close()
        browser.close()
    print('PASS: mobile bottom nav stays fixed across 320/390/430, scroll, and tabs')


if __name__ == '__main__':
    main()
