/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type -- Playwright CLI evaluates this function as its entry point. */
// Run only against an isolated Electron profile: this creates verification documents.
async function verifyCatppuccin(page) {
  const main = page
    .context()
    .pages()
    .find((candidate) => candidate.url().endsWith('index.html'))
  if (!main) throw new Error('Attach to an isolated Electron application')
  const check = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const errors = []
  main.on('pageerror', (error) => errors.push(error.message))
  const markdown = [
    '# Mocha heading',
    '## Second heading',
    '### Third heading',
    '#### Fourth heading',
    '##### Fifth heading',
    '###### Sixth heading',
    '',
    'Plain text with **strong words**, *emphasis* and [Mocha link](https://example.com).',
    '',
    '`inline code`',
    '',
    '> A quiet quotation.',
    '',
    '- First item',
    '- Second item',
    '',
    '```javascript',
    'const mocha = "green"',
    '```'
  ].join('\n')
  await main.evaluate(async (text) => {
    const unwrap = (result) => {
      if (!result.ok) throw new Error(JSON.stringify(result.error))
      return result.value
    }
    for (const context of ['editor', 'preview']) {
      unwrap(await window.draftwrite.settings.patch({ context, changes: { size: 16 } }))
    }
    let story = unwrap(await window.draftwrite.story.list()).find(
      (story) => story.topic === 'Mocha verification'
    )
    if (!story)
      story = unwrap(
        await window.draftwrite.story.create({
          topic: 'Mocha verification',
          titles: [],
          tags: ['mocha'],
          text
        })
      )
    if (!story.tags.includes('mocha'))
      unwrap(await window.draftwrite.story.update({ ...story, tags: [...story.tags, 'mocha'] }))
    unwrap(await window.draftwrite.tags.setColor('mocha', 'teal'))
    if (
      !unwrap(await window.draftwrite.article.list()).some(
        (article) => article.title === 'Mocha article'
      )
    )
      unwrap(
        await window.draftwrite.article.create({
          storyID: story.id,
          title: 'Mocha article',
          subtitle: '',
          target: '',
          text
        })
      )
    if (!unwrap(await window.draftwrite.post.list()).some((post) => post.topic === 'Mocha post'))
      unwrap(
        await window.draftwrite.post.create({
          topic: 'Mocha post',
          text,
          state: 'pending',
          scheduledAt: null,
          storyID: null,
          articleID: null
        })
      )
  }, markdown)
  await main.reload()
  check(
    (await main.locator('html').getAttribute('data-theme')) === 'catppuccin-mocha',
    'Mocha must be active from startup'
  )
  check(
    (await main
      .locator('.tag-dot')
      .first()
      .evaluate((element) => getComputedStyle(element).getPropertyValue('--tag-color').trim())) ===
      '#94e2d5',
    'Saved teal tags must use Mocha teal'
  )
  const color = (locator) => locator.evaluate((element) => getComputedStyle(element).color)
  const size = (locator) =>
    locator.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
  const headingSizes = [32, 26.4, 22.4, 18.4, 16, 14]
  const expected = [
    ['h1', 'rgb(203, 166, 247)'],
    ['h2', 'rgb(137, 180, 250)'],
    ['h3', 'rgb(148, 226, 213)'],
    ['h4', 'rgb(249, 226, 175)'],
    ['h5', 'rgb(250, 179, 135)'],
    ['h6', 'rgb(245, 194, 231)'],
    ['a', 'rgb(137, 180, 250)'],
    ['code', 'rgb(166, 227, 161)'],
    ['strong', 'rgb(250, 179, 135)'],
    ['em', 'rgb(249, 226, 175)'],
    ['blockquote p', 'rgb(166, 173, 200)']
  ]
  const contrast = []
  for (const entity of [
    { library: 'Stories', name: /Mocha verification/ },
    { library: 'Articles', name: /Mocha article/ },
    { library: 'Posts', name: /Mocha post/ }
  ]) {
    await main.getByRole('button', { name: entity.library, exact: true }).click()
    await main.getByRole('listbox').getByRole('option', { name: entity.name }).click()
    await main.getByRole('button', { name: 'Split', exact: true }).click()
    await main.locator('.cm-content').fill(markdown)
    const preview = main.getByRole('region', { name: 'Preview', exact: true })
    await preview.getByRole('heading', { name: 'Sixth heading', exact: true }).waitFor()
    for (const [selector, value] of expected) {
      check((await color(preview.locator(selector).first())) === value, `Wrong ${selector} color`)
    }
    for (const [index, text] of [
      'Mocha heading',
      'Second heading',
      'Third heading',
      'Fourth heading',
      'Fifth heading',
      'Sixth heading'
    ].entries()) {
      const expectedColor = expected[index][1]
      const expectedSize = headingSizes[index]
      check(
        Math.abs((await size(preview.locator(`h${index + 1}`))) - expectedSize) < 0.01,
        `Preview H${index + 1} must have its distinct size`
      )
      for (const token of [text, '#'.repeat(index + 1)]) {
        const editorToken = main.locator('.cm-content').getByText(token, { exact: true }).first()
        check(
          (await color(editorToken)) === expectedColor,
          `H${index + 1} text and marker must match preview: ${token}`
        )
        check(
          Math.abs((await size(editorToken)) - expectedSize) < 0.01,
          `Editor H${index + 1} text and marker must match preview size: ${token}`
        )
      }
    }
    for (const [text, value] of [
      ['Mocha heading', 'rgb(203, 166, 247)'],
      ['Mocha link', 'rgb(137, 180, 250)'],
      ['inline code', 'rgb(166, 227, 161)']
    ]) {
      check(
        (await color(main.locator('.cm-content').getByText(text, { exact: true }).first())) ===
          value,
        `Editor color must match preview: ${text}`
      )
    }
    const samples = await main.evaluate(() => {
      const luminance = (rgb) =>
        Array.from(rgb)
          .slice(0, 3)
          .reduce((sum, channel, index) => {
            const value = channel / 255
            return (
              sum +
              (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
                [0.2126, 0.7152, 0.0722][index]
            )
          }, 0)
      return [
        '.cm-content',
        '.markdown-preview p',
        '.markdown-preview h1',
        '.markdown-preview h2',
        '.markdown-preview h3',
        '.markdown-preview h4',
        '.markdown-preview h5',
        '.markdown-preview h6',
        '.markdown-preview a',
        '.markdown-preview code',
        '.markdown-preview blockquote p',
        '.markdown-preview li',
        '[aria-label="Title bar"]',
        '[data-heading-input]'
      ].map((selector) => {
        const element = document.querySelector(selector)
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d', { willReadFrequently: true })
        // Composite translucent surfaces over white, the worst-case bright desktop.
        context.fillStyle = '#fff'
        context.fillRect(0, 0, 1, 1)
        const ancestors = []
        for (let parent = element; parent; parent = parent.parentElement) ancestors.unshift(parent)
        for (const parent of ancestors) {
          context.fillStyle = getComputedStyle(parent).backgroundColor
          context.fillRect(0, 0, 1, 1)
        }
        const bg = luminance(context.getImageData(0, 0, 1, 1).data)
        context.fillStyle = getComputedStyle(element).color
        context.fillRect(0, 0, 1, 1)
        const fg = luminance(context.getImageData(0, 0, 1, 1).data)
        return { selector, ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) }
      })
    })
    for (const sample of samples) check(sample.ratio >= 4.5, JSON.stringify(sample))
    contrast.push({ library: entity.library, samples })
    await main.getByRole('button', { name: 'Edit', exact: true }).click()
    check((await preview.count()) === 0, 'Edit mode must hide preview')
    await main.getByRole('button', { name: 'Preview', exact: true }).click()
    check(!(await main.locator('.cm-editor').isVisible()), 'Preview mode must hide editor')
    await main.getByRole('button', { name: 'Split', exact: true }).click()
    await main.locator('.cm-content').focus()
    await main.keyboard.press('Control+Home')
    await main.keyboard.press('Shift+ArrowRight')
    check(
      (await main
        .locator('.cm-selectionBackground')
        .first()
        .evaluate((element) => getComputedStyle(element).backgroundColor)) === 'rgb(69, 71, 90)',
      'Editor selection must use Mocha surface1'
    )
    await main.keyboard.press('ArrowRight')
    for (const width of [900, 1440]) {
      await main.setViewportSize({ width, height: 900 })
      await main.screenshot({ path: `/tmp/opencode/mocha-${entity.library}-${width}.png` })
    }
  }
  await main.evaluate(async () => {
    for (const context of ['editor', 'preview']) {
      const result = await window.draftwrite.settings.patch({ context, changes: { size: 20 } })
      if (!result.ok) throw new Error(JSON.stringify(result.error))
    }
  })
  await main.waitForFunction(
    () => getComputedStyle(document.querySelector('.markdown-preview h1')).fontSize === '40px'
  )
  for (const [text, level, expectedSize] of [
    ['Mocha heading', 1, 40],
    ['Sixth heading', 6, 17.5]
  ]) {
    check(
      Math.abs(
        (await size(main.locator('.cm-content').getByText(text, { exact: true }).first())) -
          expectedSize
      ) < 0.01,
      `Editor H${level} must follow the configured base size`
    )
    check(
      Math.abs((await size(main.locator(`.markdown-preview h${level}`))) - expectedSize) < 0.01,
      `Preview H${level} must follow the configured base size`
    )
  }
  const pendingSettings = main.context().waitForEvent('page')
  await main.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = await pendingSettings
  await settings.getByRole('heading', { name: 'Typography' }).waitFor()
  check(
    (await settings
      .locator('body')
      .evaluate((element) => getComputedStyle(element).backgroundColor)) === 'rgb(30, 30, 46)',
    'Settings must use Mocha base'
  )
  await settings.screenshot({ path: '/tmp/opencode/mocha-settings.png' })
  await settings.close()
  await main.keyboard.press('Control+k')
  await main.getByRole('dialog', { name: 'Quick switcher' }).waitFor()
  await main.screenshot({ path: '/tmp/opencode/mocha-search.png' })
  await main.keyboard.press('Escape')
  await main
    .getByRole('banner', { name: 'Title bar' })
    .getByRole('button', { name: 'Delete post' })
    .click()
  await main.getByRole('dialog').waitFor()
  await main.screenshot({ path: '/tmp/opencode/mocha-delete.png' })
  await main.getByRole('button', { name: 'Cancel', exact: true }).click()
  await main.keyboard.press('Control+n')
  await main.getByRole('button', { name: 'Discard', exact: true }).waitFor()
  check(
    await main
      .getByRole('banner', { name: 'Title bar' })
      .getByRole('group', { name: 'View mode' })
      .isVisible(),
    'Creation must retain the themed view mode switcher'
  )
  await main.screenshot({ path: '/tmp/opencode/mocha-create.png' })
  await main.getByRole('button', { name: 'Discard', exact: true }).click()
  check(errors.length === 0, errors.join('; '))
  return { theme: 'catppuccin-mocha', contrast, errors }
}
