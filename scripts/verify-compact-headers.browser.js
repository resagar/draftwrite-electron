/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type -- Playwright CLI entry point. */
// Use an isolated Electron profile: this creates verification documents.
async function verifyCompactHeaders(page) {
  const main = page
    .context()
    .pages()
    .find((item) => !item.url().endsWith('#settings'))
  const check = (ok, message) => {
    if (!ok) throw new Error(message)
  }
  await main.evaluate(async () => {
    const unwrap = (result) => {
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    }
    const stories = unwrap(await window.draftwrite.story.list())
    const story =
      stories.find((item) => item.topic === 'Compact heading check') ??
      unwrap(
        await window.draftwrite.story.create({
          topic: 'Compact heading check',
          text: '',
          titles: [],
          tags: []
        })
      )
    if (
      !unwrap(await window.draftwrite.article.list()).some(
        (item) => item.title === 'Compact article check'
      )
    )
      unwrap(
        await window.draftwrite.article.create({
          storyID: story.id,
          title: 'Compact article check',
          subtitle: '',
          target: '',
          text: ''
        })
      )
    if (
      !unwrap(await window.draftwrite.post.list()).some(
        (item) => item.topic === 'Compact post check'
      )
    )
      unwrap(
        await window.draftwrite.post.create({
          topic: 'Compact post check',
          text: '',
          state: 'pending',
          scheduledAt: null,
          storyID: null,
          articleID: null
        })
      )
  })
  await main.reload()
  const results = []
  for (const [library, name, kind] of [
    ['Stories', 'Compact heading check', 'Story'],
    ['Articles', 'Compact article check', 'Article'],
    ['Posts', 'Compact post check', 'Post']
  ]) {
    await main.getByRole('button', { name: library, exact: true }).click()
    await main
      .getByRole('option', { name: new RegExp(name) })
      .first()
      .click()
    const heading = main.locator('[data-heading-input]')
    const properties = main.getByRole('button', { name: `${kind} properties`, exact: true })
    for (const width of [1440, 1000]) {
      await main.setViewportSize({ width, height: 900 })
      const boxes = await main.locator('.workspace-band').evaluate((band) => {
        const input = band.querySelector('[data-heading-input]').getBoundingClientRect()
        const toggle = band.querySelector('[aria-expanded]').getBoundingClientRect()
        return {
          width: band.clientWidth,
          overflow: band.scrollWidth > band.clientWidth + 1,
          inputTop: input.top,
          toggleTop: toggle.top
        }
      })
      check(!boxes.overflow, `${kind} header overflow at ${width}`)
      if (width === 1440)
        check(
          Math.abs(boxes.inputTop - boxes.toggleTop) < 10,
          `${kind} still forces a separate heading row`
        )
      await properties.click()
      for (const field of await main
        .locator('.workspace-band input:visible, .workspace-band select:visible')
        .all()) {
        for (const state of ['idle', 'hover', 'focus']) {
          if (state === 'hover' && (await field.isEnabled())) await field.hover()
          if (state === 'focus' && (await field.isEnabled())) {
            await main.keyboard.press('Tab')
            await field.focus()
          }
          const style = await field.evaluate((element) => {
            const css = getComputedStyle(element)
            return { border: css.borderWidth, outline: css.outlineStyle, shadow: css.boxShadow }
          })
          check(
            style.border === '0px' && style.outline === 'none' && style.shadow === 'none',
            `${kind} field has a line in ${state}: ${JSON.stringify(style)}`
          )
        }
      }
      await properties.click()
      results.push({ kind, viewport: width, ...boxes })
    }
    const original = await heading.inputValue()
    await main.setViewportSize({ width: 1000, height: 900 })
    await main.evaluate(async () => {
      const result = await window.draftwrite.settings.patch({
        context: 'interface',
        changes: { size: 125 }
      })
      if (!result.ok) throw new Error(result.error.message)
    })
    await heading.fill('A long document heading that remains editable '.repeat(4))
    for (const sidebar of ['open', 'closed']) {
      if (sidebar === 'closed')
        await main.getByRole('button', { name: 'Toggle sidebar', exact: true }).click()
      check(
        await main
          .locator('.workspace-band')
          .evaluate((band) => band.scrollWidth <= band.clientWidth + 1),
        `${kind} overflow with long text, 125% typography, sidebar ${sidebar}`
      )
    }
    await main.getByRole('button', { name: 'Toggle sidebar', exact: true }).click()
    await heading.fill(original)
    await main.evaluate(async () => {
      const result = await window.draftwrite.settings.patch({
        context: 'interface',
        changes: { size: 100 }
      })
      if (!result.ok) throw new Error(result.error.message)
    })
    await main.setViewportSize({ width: 1440, height: 900 })
    await main.screenshot({ path: `/tmp/compact-header-${kind}.png` })
  }
  return results
}
