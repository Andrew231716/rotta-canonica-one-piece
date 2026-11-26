"""v29.2 — top safe-area / brand visibility on iPhone-sized viewports."""
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:8767/'


def main():
    chrome = '/usr/bin/google-chrome' if Path('/usr/bin/google-chrome').exists() else '/usr/bin/chromium'
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=chrome, args=['--no-sandbox', '--disable-dev-shm-usage'])
        for width, height, sat in ((320, 720, 44), (390, 844, 47), (430, 932, 59)):
            page = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
            try:
                page.goto(URL, wait_until='networkidle', timeout=8000)
            except Exception as exc:
                raise AssertionError(f'Local server required at {URL}') from exc
            # Simulate notch safe-area (Playwright does not provide env(safe-area-*) by default).
            page.add_style_tag(content=f"""
              @media(max-width:920px){{
                body::before{{height:{sat}px!important;min-height:{sat}px!important}}
                .mobile-chrome{{padding-top:calc({sat}px + 10px)!important}}
                html:not([data-atlas="off"]):is([data-active-section="path"],[data-active-section="more"]) .main{{
                  padding-top:calc({sat}px + 12px)!important
                }}
              }}
            """)
            page.wait_for_timeout(80)

            # Home / atlas: content must clear the simulated status bar
            home = page.evaluate(
                """(sat) => {
                  const atlas = document.querySelector('.atlas-landing, .hero.gl-hero');
                  const main = document.querySelector('.main');
                  const chrome = document.querySelector('.mobile-chrome');
                  const r = (atlas || main.children[1] || main).getBoundingClientRect();
                  return {
                    chromeDisplay: getComputedStyle(chrome).display,
                    contentTop: Math.round(r.top),
                    padTop: parseFloat(getComputedStyle(main).paddingTop) || 0,
                    sat,
                  };
                }""",
                sat,
            )
            assert home['padTop'] >= sat + 10, (width, home)
            assert home['contentTop'] >= sat - 1, (width, home)

            # Characters: chrome visible, brand readable
            page.evaluate("setTab('characters')")
            page.wait_for_timeout(100)
            chars = page.evaluate(
                """(sat) => {
                  const chrome = document.querySelector('.mobile-chrome');
                  const brand = document.querySelector('.mobile-brand');
                  const title = document.querySelector('.mobile-brand-title');
                  const cr = chrome.getBoundingClientRect();
                  const br = brand.getBoundingClientRect();
                  const ts = getComputedStyle(title);
                  return {
                    chromeDisplay: getComputedStyle(chrome).display,
                    chromeTop: Math.round(cr.top),
                    chromeH: Math.round(cr.height),
                    brandH: Math.round(br.height),
                    titleSize: parseFloat(ts.fontSize),
                    titleColor: ts.color,
                    padTop: getComputedStyle(chrome).paddingTop,
                  };
                }""",
                sat,
            )
            assert chars['chromeDisplay'] == 'block', (width, chars)
            assert chars['chromeH'] >= sat + 70, (width, chars)
            assert chars['brandH'] >= 56, (width, chars)
            assert chars['titleSize'] >= 17, (width, chars)

            # Bottom nav still fixed
            page.evaluate('window.scrollTo(0, 800)')
            page.wait_for_timeout(80)
            nav = page.evaluate(
                """() => {
                  const r = document.querySelector('.mobile-nav').getBoundingClientRect();
                  return {
                    position: getComputedStyle(document.querySelector('.mobile-nav')).position,
                    bottom: Math.round(r.bottom),
                    vh: window.innerHeight,
                  };
                }"""
            )
            assert nav['position'] == 'fixed' and abs(nav['bottom'] - nav['vh']) <= 2, (width, nav)
            page.close()
        browser.close()
    print('PASS: iPhone top safe-area + brand visibility (320/390/430)')


if __name__ == '__main__':
    main()
