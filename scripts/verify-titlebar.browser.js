/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type -- Playwright CLI evaluates this function as its entry point. */
// Attach to an isolated Electron app on Windows/Linux; run at minimum and maximized sizes.
async function verifyTitlebar(page) {
  const main = page
    .context()
    .pages()
    .find(
      (candidate) => candidate.url().startsWith('file:') && !candidate.url().endsWith('#settings')
    )
  if (!main) throw new Error('Attach to an isolated Electron application')
  const check = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const zen = main.getByRole('button', { name: /^Zen mode/ })
  const wasZen = (await zen.getAttribute('aria-pressed')) === 'true'
  const results = []
  try {
    for (const enabled of [false, true]) {
      if (((await zen.getAttribute('aria-pressed')) === 'true') !== enabled) await zen.click()
      const geometry = await main.evaluate(() => {
        const header = document.querySelector('header[aria-label="Title bar"]')
        const bounds = header.getBoundingClientRect()
        const paddingRight = parseFloat(getComputedStyle(header).paddingRight)
        const overlay = navigator.windowControlsOverlay
        const safe = overlay?.getTitlebarAreaRect()
        return {
          width: innerWidth,
          visible: overlay?.visible === true,
          left: bounds.left,
          right: bounds.right,
          paddingRight,
          safeLeft: safe?.x,
          safeRight: safe ? safe.x + safe.width : undefined,
          draggable: getComputedStyle(header).getPropertyValue('-webkit-app-region') === 'drag',
          buttons: [...header.querySelectorAll('button')].map((button) => {
            const rect = button.getBoundingClientRect()
            return {
              label: button.getAttribute('aria-label'),
              inside: rect.left >= bounds.left && rect.right <= bounds.right - paddingRight + 0.5,
              clickable:
                getComputedStyle(button).getPropertyValue('-webkit-app-region') === 'no-drag'
            }
          })
        }
      })
      check(geometry.visible, 'Native Window Controls Overlay is not active')
      check(geometry.draggable, 'Header has no drag region')
      check(geometry.left >= geometry.safeLeft, 'Header overlaps left window controls')
      check(
        geometry.paddingRight >= geometry.width - geometry.safeRight - 1,
        'Header content is not clear of the right window controls'
      )
      for (const button of geometry.buttons) {
        check(button.inside, `${button.label} overflows the header`)
        check(button.clickable, `${button.label} is inside a drag region`)
      }
      await main.keyboard.press('Control+k')
      await main.getByRole('dialog').waitFor()
      await main.keyboard.press('Escape')
      await main.getByRole('dialog').waitFor({ state: 'hidden' })
      results.push({ zen: enabled, geometry })
    }
    return results
  } finally {
    if (((await zen.getAttribute('aria-pressed')) === 'true') !== wasZen) await zen.click()
  }
}
