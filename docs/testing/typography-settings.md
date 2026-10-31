# Typography verification

The Jest tests cover preferences storage, the font catalog, the browser data-port
boundary and the Settings flow through the application. Layout and font loading
are verified separately in a real renderer.

## Electron on Linux

Build the app with `pnpm build`. Install `playwright-cli` separately if it is not
already available; it is not an application dependency.

Use an isolated Electron profile and database. The verification script creates a
Story, resets typography and sidebar preferences, and changes them during the run.
Do not attach it to your normal writing session.

```sh
XDG_CONFIG_HOME=/tmp/draftwrite-typography-config \
XDG_DATA_HOME=/tmp/draftwrite-typography-data \
pnpm exec electron --ozone-platform=headless --disable-gpu \
  --remote-debugging-port=9224 out/main/main.js
```

On a machine with a display, omit `--ozone-platform=headless`. Containers that
cannot run Chromium's sandbox may need `--no-sandbox` for this test process only.

In another terminal:

```sh
playwright-cli -s=typography-electron attach --cdp=http://127.0.0.1:9224
playwright-cli -s=typography-electron run-code --filename=scripts/verify-typography.browser.js
playwright-cli -s=typography-electron detach
```

The script verifies all five bundled Monaspace families, real system-font access
without a permission override, independent reading sizes, heading proportions,
monospaced code, interface font and control scaling, pointer-aligned panel resizing,
editor identity and scroll preservation, reload persistence, range endpoints,
keyboard focus and the supported minimum window size. Screenshots are written to
`/tmp/draftwrite-typography-desktop.png` and `/tmp/draftwrite-typography-small.png`.

It also checks that font permission handling preserves the existing clipboard-write
permission. The source-text Copy action should continue to report `Copied`.

Stop and relaunch the isolated Electron process with the same directories, then
open Settings to check preferences survive a full application restart.

## Chromium only

Serve the built renderer using:

```sh
pnpm exec vite preview --host 127.0.0.1 --port 4173 --outDir out/renderer
playwright-cli -s=typography open http://127.0.0.1:4173
playwright-cli -s=typography run-code --filename=scripts/verify-typography.browser.js
playwright-cli -s=typography close
```

Use Playwright CLI's browser configuration if your Chromium executable is outside
its default locations. In this mode the script substitutes only the database IPC
API with a deterministic Story fixture and grants the browser's font permission.
Font enumeration, font loading, CSS, layout and interactions remain real. This mode
does not verify Electron's permission policy or the SQLite/preload path.
