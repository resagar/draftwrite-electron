# Typography and settings-window verification

Jest covers preference migration and validation, Settings through the application
and a second renderer root, the data port and the settings IPC boundary. Native
window lifecycle, permissions and text geometry require Electron itself.

## Electron on Linux

Run `pnpm build`. Use `playwright-cli` if it is already installed, or install it
separately; it is not an application dependency.

Use an isolated profile and SQLite database. The script creates and edits a Story,
changes preferences and temporarily substitutes the storage-write boundary to
exercise failures. Do not attach it to your normal writing session.

```sh
XDG_CONFIG_HOME=/tmp/draftwrite-settings-window-config \
XDG_DATA_HOME=/tmp/draftwrite-settings-window-data \
pnpm exec electron --ozone-platform=headless --disable-gpu \
  --remote-debugging-port=9225 out/main/main.js
```

On a machine with a display, omit `--ozone-platform=headless`. Containers that
cannot run Chromium's sandbox may need `--no-sandbox` for this test process only.

In another terminal:

```sh
playwright-cli -s=settings-window attach --cdp=http://127.0.0.1:9225
playwright-cli -s=settings-window run-code --filename=scripts/verify-typography.browser.js
playwright-cli -s=settings-window detach
```

The script verifies:

- A second native window, repeated opening without duplicates, continued editing
  in the principal, the dedicated Settings renderer, close/reopen and the native title.
- Loading all five Monaspace families and real system fonts in the auxiliary,
  without overriding Electron's font permissions.
- Independent font, font size and line height, interface font/scale in both windows,
  proportional headings, monospaced code, aligned gutters and scroll synchronization.
- Actual 24 px editor rows at font size 16 and line height 1.5; actual 25 px preview
  body lines at font size 20 and line height 1.25.
- Size endpoints 10/40 px, line-height endpoints 1/3, UI scales 80/150 %, keyboard
  focus, window sizes 800 × 760 and 560 × 480, and persistence of accepted choices.
- Ordered partial updates, invalid IPC rejection, immediate application after a
  failed save, session-choice recovery on reopening, and restoration per context.
- Preservation of the existing clipboard-write permission in the principal.

Screenshots are written to `/tmp/draftwrite-settings-window.png` and
`/tmp/draftwrite-settings-window-small.png`.

## Additional lifecycle and regression checks

Stop and restart the isolated app with the same directories, then open Settings:
editor line height should be 1.5 and preview line height 1.25 after the script.
Minimize Settings, press the principal's gear and confirm it restores and focuses
without creating a third window. Close the principal while Settings is open and
check that no auxiliary window remains.

Check Copy source text with an Article or Post linked to a Story: it should report
Copied. Open Settings with an incomplete draft and verify no discard prompt appears
and the draft stays editable. Check a removed/reappearing font at the catalog
boundary without uninstalling real fonts from the host.

For headless lifecycle automation, Electron's main-process Node inspector can be
started separately with `--inspect=127.0.0.1:9230`. Use it only on the isolated test
instance, to observe the public BrowserWindow APIs for minimized/focused state and
to create an unrelated test window that must be rejected by the settings IPC and
font-permission policy. It is not enabled by application code.

A standalone Chromium page cannot prove these native-window behaviors. The previous
HTTP fixture mode is replaced by the Electron harness; jsdom is not used to assert
layout, line heights, native permissions or scroll positions.
