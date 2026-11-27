"""v31.0 — Watch Session: Segna visto e continua, spoiler-safe next, achievements."""
from __future__ import annotations

import http.server
import json
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = 'http://127.0.0.1:8791/'
VIEWPORTS = (
    (320, 568),
    (375, 667),
    (390, 844),
    (430, 932),
    (768, 1024),
    (1024, 768),
    (1280, 800),
)
ARTIFACTS = Path('/opt/cursor/artifacts/v31-watch-session')
EXTRA_KEY = 'rotta-canonica-extra-v1'
STORAGE = 'rotta-canonica-v1'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):  # noqa: A003
        pass


def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', 8791), QuietHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def chrome_kwargs():
    chrome = '/usr/bin/google-chrome' if Path('/usr/bin/google-chrome').exists() else None
    kwargs = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
    if chrome:
        kwargs['executable_path'] = chrome
    return kwargs


def seed_progress(page, *, watched=None, start=92, spoiler=True, watched_at=None, seen=None):
    payload = {
        'watched': watched if watched is not None else [],
        'start': start,
        'showFiller': False,
    }
    extra = {
        'spoiler': spoiler,
        'watchedAt': watched_at or {},
        'favorites': [],
        'notes': {},
        'ratings': {},
        'noteDrafts': {},
        'hideCompleted': False,
        'reminderDays': 0,
        'theme': 'light',
        'appearanceStyle': 'anime',
        'symbolStyle': 'anime',
        'colorPalette': 'coral',
        'customAccent': '#dc4c34',
        'animationLevel': 'off',
        'watchEdits': {},
        'favoriteEdits': {},
        'noteEdits': {},
        'ratingEdits': {},
        'settingsUpdatedAt': 0,
        'catalogOverride': {},
        'characterFavorites': [],
        'characterFavoriteEdits': {},
    }
    if seen is not None:
        extra['seenAchievements'] = seen
    page.add_init_script(
        f"""localStorage.setItem({json.dumps(STORAGE)}, {json.dumps(json.dumps(payload))});
localStorage.setItem({json.dumps(EXTRA_KEY)}, {json.dumps(json.dumps(extra))});"""
    )


def load_app(page, width, height):
    page.set_viewport_size({'width': width, 'height': height})
    page.goto(URL, wait_until='networkidle', timeout=25000)
    page.wait_for_selector('.watch-session', timeout=10000)
    page.wait_for_timeout(200)


def read_state(page):
    return page.evaluate(
        """([storage, extraKey]) => {
          const main = JSON.parse(localStorage.getItem(storage) || '{}');
          const extra = JSON.parse(localStorage.getItem(extraKey) || '{}');
          return {
            watched: main.watched || [],
            watchedAt: extra.watchedAt || {},
            seenAchievements: extra.seenAchievements,
            spoiler: extra.spoiler !== false,
            sessionEp: document.querySelector('.watch-session')?.getAttribute('data-session-ep'),
            sessionComplete: document.querySelector('.watch-session')?.getAttribute('data-session') === 'complete',
            sessionText: document.querySelector('.watch-session')?.innerText || '',
            rewardTitle: document.querySelector('.reward-celebration h3')?.textContent || null,
            modalOpen: !!document.querySelector('.modal-layer'),
          };
        }""",
        [STORAGE, EXTRA_KEY],
    )


def assert_no_hscroll(page, label):
    overflow = page.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
    assert overflow <= 1, f'{label}: horizontal overflow {overflow}px'


def assert_nav_clear(page, label):
    metrics = page.evaluate(
        """() => {
          const nav = document.querySelector('.mobile-nav');
          const session = document.querySelector('.watch-session');
          if (!nav || getComputedStyle(nav).display === 'none' || !session) {
            return {skip: true};
          }
          session.scrollIntoView({block:'center'});
          const nr = nav.getBoundingClientRect();
          const btns = [...session.querySelectorAll('.watch-session-actions .button')];
          const covered = btns.some(btn => {
            const br = btn.getBoundingClientRect();
            return br.bottom > nr.top + 2 && br.top < nr.bottom - 2;
          });
          const btnH = btns[0] ? btns[0].getBoundingClientRect().height : 0;
          return {
            skip: false,
            covered,
            btnH,
            navFixed: getComputedStyle(nav).position === 'fixed',
          };
        }"""
    )
    if metrics.get('skip'):
        return
    assert metrics['navFixed'], f'{label}: mobile-nav not fixed'
    assert not metrics['covered'], f'{label}: session actions covered by mobile-nav'
    assert metrics['btnH'] >= 40, f'{label}: session button too small ({metrics["btnH"]})'


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    httpd = start_server()
    failures = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(**chrome_kwargs())

            # 1–4, 11: mark watched, watchedAt, next, double-click, achievement
            page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            seed_progress(page, watched=[], start=92, spoiler=True, seen=[])
            load_app(page, 390, 844)
            before = read_state(page)
            assert before['sessionEp'] == '92', f"expected next 92, got {before['sessionEp']}"
            page.locator('[data-action="session-watch"]').click()
            page.wait_for_timeout(250)
            mid = read_state(page)
            assert 92 in mid['watched'], '1. Segna visto must update watched'
            assert '92' in mid['watchedAt'] and isinstance(mid['watchedAt']['92'], str), '2. watchedAt ISO missing'
            assert mid['sessionEp'] == '93', f"3. next should be 93, got {mid['sessionEp']}"
            assert mid['rewardTitle'] == 'Prima vela', f"11. named achievement missing: {mid['rewardTitle']}"
            if mid['modalOpen']:
                page.locator('[data-action="modal-cancel"]').click()
                page.wait_for_timeout(150)
            page.close()

            page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            seed_progress(page, watched=[92], start=92, spoiler=True, seen=['first'], watched_at={'92': '2026-11-20T10:00:00.000Z'})
            load_app(page, 390, 844)
            assert read_state(page)['sessionEp'] == '93'
            dbl = page.evaluate(
                """() => {
                  const r1 = markEpisodeSeen(93);
                  const r2 = markEpisodeSeen(93);
                  const mods = document.querySelectorAll('.reward-celebration').length;
                  return {r1, r2, watched: [...watched], mods, seen: extra.seenAchievements || []};
                }"""
            )
            assert dbl['r1']['ok'] and dbl['r1']['changed'], '4. first mark should change'
            assert dbl['r2']['ok'] and not dbl['r2']['changed'], '4. second mark must be no-op'
            assert dbl['watched'].count(93) == 1, f"4. duplicated 93: {dbl['watched']}"
            assert dbl['mods'] == 0, '11. duplicate achievement celebration'
            page.close()

            # Segna visto e continua opens next without marking the next
            page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            seed_progress(page, watched=[], start=92, spoiler=True, seen=['first'])
            load_app(page, 390, 844)
            page.locator('[data-action="session-watch-continue"]').click()
            page.wait_for_timeout(350)
            cont = read_state(page)
            assert 92 in cont['watched'] and 93 not in cont['watched'], 'continue must not auto-mark next'
            assert cont['sessionEp'] == '93'
            page.close()

            # 5. filler never becomes session next / mark rejects filler path via getNext over allCanon
            page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            seed_progress(page, watched=list(range(1, 57)), start=1, spoiler=False, seen=['first', 'ten', 'fifty', 'east'])
            load_app(page, 390, 844)
            filler_check = page.evaluate(
                """() => {
                  const ep = Number(document.querySelector('.watch-session')?.getAttribute('data-session-ep'));
                  const isFiller = typeof filler !== 'undefined' && filler.has(ep);
                  return {ep, isFiller, showFiller: showFiller};
                }"""
            )
            assert filler_check['ep'] and not filler_check['isFiller'], f"5. filler next leaked: {filler_check}"
            page.close()

            # 6–8. blocked / spoiler titles
            page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            seed_progress(page, watched=[92], start=92, spoiler=True, seen=['first'], watched_at={'92': '2026-11-01T00:00:00.000Z'})
            load_app(page, 390, 844)
            spoiler_on = page.evaluate(
                """() => {
                  const panel = document.querySelector('.watch-session');
                  const ep = Number(panel?.getAttribute('data-session-ep'));
                  const title = panel?.querySelector('b')?.textContent || '';
                  const horizon = spoilerHorizon();
                  const isBlocked = blocked(ep);
                  return {ep, title, horizon, isBlocked, text: panel?.innerText || ''};
                }"""
            )
            assert spoiler_on['ep'] == 93 and spoiler_on['isBlocked'], '6. next beyond horizon should be blocked'
            assert spoiler_on['title'] == 'Episodio 93', f"7. spoiler on leaked title: {spoiler_on['title']}"
            assert 'Isola inesplorata' in spoiler_on['text'] or 'Episodio 93' in spoiler_on['text']
            page.close()

            page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            seed_progress(page, watched=[92], start=92, spoiler=False, seen=['first'])
            load_app(page, 390, 844)
            spoiler_off = page.evaluate(
                """() => {
                  const panel = document.querySelector('.watch-session');
                  const title = panel?.querySelector('b')?.textContent || '';
                  return {title, blocked: blocked(93)};
                }"""
            )
            assert not spoiler_off['blocked'], '8. spoiler off should not block'
            assert spoiler_off['title'] != 'Isola inesplorata'
            page.close()

            # 9. complete state
            page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            # Mark a synthetic complete via evaluating after load
            seed_progress(page, watched=[], start=92, spoiler=False, seen=[])
            load_app(page, 390, 844)
            page.evaluate(
                """() => {
                  for (const n of allCanon) { watched.add(n); }
                  saveAll();
                  render();
                }"""
            )
            page.wait_for_timeout(200)
            done = read_state(page)
            assert done['sessionComplete'], '9. missing conclusive complete state'
            assert 'completata' in done['sessionText'].lower() or 'completato' in done['sessionText'].lower()
            page.close()

            # 10. resume after refresh using watchedAt pause note
            page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            seed_progress(
                page,
                watched=[92, 93],
                start=92,
                spoiler=True,
                seen=['first'],
                watched_at={'92': '2026-10-01T00:00:00.000Z', '93': '2026-10-01T00:00:00.000Z'},
            )
            load_app(page, 390, 844)
            resume = read_state(page)
            assert resume['sessionEp'] == '94', f"10. resume next wrong: {resume['sessionEp']}"
            assert 'giorni' in resume['sessionText'].lower(), '10. pause resume note missing'
            page.reload(wait_until='networkidle')
            page.wait_for_selector('.watch-session', timeout=10000)
            resume2 = read_state(page)
            assert resume2['sessionEp'] == '94' and 92 in resume2['watched'] and 93 in resume2['watched']
            page.close()

            # 12. responsive + mobile nav + screenshots
            for width, height in VIEWPORTS:
                page = browser.new_page(
                    viewport={'width': width, 'height': height},
                    is_mobile=width <= 430,
                    has_touch=width <= 430,
                )
                seed_progress(page, watched=[92], start=92, spoiler=True, seen=['first'], watched_at={'92': '2026-11-01T00:00:00.000Z'})
                load_app(page, width, height)
                assert page.locator('.watch-session').count() == 1, f'{width}: missing session'
                assert_no_hscroll(page, f'{width}x{height}')
                assert_nav_clear(page, f'{width}x{height}')
                # nav still works
                if width <= 920:
                    page.locator('.mobile-nav [data-tab="episodes"]').click()
                    page.wait_for_timeout(200)
                    assert page.locator('.watch-session').count() >= 1, f'{width}: session missing on episodes'
                    page.locator('.mobile-nav [data-tab="path"]').click()
                    page.wait_for_timeout(200)
                shot = ARTIFACTS / f'session-{width}x{height}.png'
                page.screenshot(path=str(shot), full_page=False)
                page.close()

            browser.close()
    finally:
        httpd.shutdown()

    report = {'ok': True, 'artifacts': str(ARTIFACTS), 'viewports': list(VIEWPORTS)}
    (ARTIFACTS / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('v31 watch session tests passed')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
