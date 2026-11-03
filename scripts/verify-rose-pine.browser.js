/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type -- Playwright CLI evaluates this function as its entry point. */
// Run only against an isolated Electron profile: this creates verification documents.
async function verifyRosePine(page) {
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
  const errors = []
  main.on('pageerror', (error) => errors.push(error.message))
  const markdown = [
    '# Moon heading',
    '## Second heading',
    '### Third heading',
    '#### Fourth heading',
    '##### Fifth heading',
    '###### Sixth heading',
    '',
    'Plain text with **strong words**, *emphasis* and [Moon link](https://example.com).',
    '',
    '`inline code`',
    '',
    '> A quiet quotation.',
    '',
    '- First item',
    '- Second item',
    '',
    '- [x] Completed task',
    '- [ ] Pending task',
    '',
    '---',
    '',
    '| Column | Value |',
    '| --- | --- |',
    '| Moon | Palette |',
    '',
    '```javascript',
    'const moon = "gold"',
    '```',
    '',
    '~~Deleted words~~',
    '',
    ...Array.from(
      { length: 60 },
      (_, index) => `Paragraph ${index}: a line for scroll verification.\n`
    )
  ].join('\n')
  await main.evaluate(async (text) => {
    const unwrap = (result) => {
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    }
    unwrap(
      await window.draftwrite.settings.patch({ context: 'editor', changes: { vimMode: false } })
    )
    const stories = unwrap(await window.draftwrite.story.list())
    let story = stories.find((item) => item.topic === 'Moon verification')
    if (!story)
      story = unwrap(
        await window.draftwrite.story.create({
          topic: 'Moon verification',
          titles: [],
          tags: [],
          text
        })
      )
    const articles = unwrap(await window.draftwrite.article.list())
    if (!articles.some((item) => item.title === 'Moon article')) {
      unwrap(
        await window.draftwrite.article.create({
          storyID: story.id,
          title: 'Moon article',
          subtitle: '',
          target: '',
          text
        })
      )
    }
    const posts = unwrap(await window.draftwrite.post.list())
    if (!posts.some((item) => item.topic === 'Moon post')) {
      unwrap(
        await window.draftwrite.post.create({
          topic: 'Moon post',
          text,
          state: 'pending',
          scheduledAt: null,
          storyID: null,
          articleID: null
        })
      )
    }
  }, markdown)
  await main.reload()
  await main.setViewportSize({ width: 1440, height: 900 })
  await main.getByRole('button', { name: 'Stories', exact: true }).click()
  await main
    .getByRole('listbox')
    .getByRole('option', { name: /Moon verification/ })
    .click()
  await main.getByRole('button', { name: 'Split', exact: true }).click()
  const preview = main.getByRole('region', { name: 'Preview', exact: true })
  await preview.getByRole('heading', { name: 'Moon heading', exact: true }).waitFor()
  await main.evaluate(() => document.fonts.ready)
  const geometry = await main.evaluate(() => {
    const selectors = [
      'body',
      '.cm-editor',
      '.cm-content',
      '.cm-gutters',
      '[aria-label="Preview"] article',
      '[aria-label="Preview"] h1',
      '[aria-label="Preview"] p',
      '[aria-label="Preview"] pre'
    ]
    return selectors.map((selector) => {
      const element = document.querySelector(selector)
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return {
        selector,
        width: rect.width,
        height: rect.height,
        font: style.fontFamily,
        size: style.fontSize,
        weight: style.fontWeight,
        lineHeight: style.lineHeight,
        padding: style.padding,
        margin: style.margin
      }
    })
  })
  const before = await main.evaluate(() => document.documentElement.dataset.theme === 'dracula')
  if (before) {
    await main.evaluate(
      (value) => localStorage.setItem('moon-verification-baseline', JSON.stringify(value)),
      geometry
    )
    await main.screenshot({ path: '/tmp/draftwrite-moon-before.png' })
  }
  const color = (locator) => locator.evaluate((element) => getComputedStyle(element).color)
  const iris = 'rgb(196, 167, 231)'
  const foam = 'rgb(156, 207, 216)'
  const gold = 'rgb(246, 193, 119)'
  check((await color(preview.locator('h1'))) === iris, 'Preview headings must use Moon iris')
  for (const level of ['h2', 'h3', 'h4', 'h5', 'h6']) {
    check((await color(preview.locator(level))) === iris, `${level} must use Moon iris`)
  }
  check((await color(preview.locator('a'))) === foam, 'Preview links must use Moon foam')
  check((await color(preview.locator('code').first())) === gold, 'Inline code must use Moon gold')
  check(
    (await color(preview.locator('pre code'))) === gold,
    'Fenced code must use uniform Moon gold'
  )
  const token = (text) =>
    main
      .locator('.cm-content span')
      .filter({ hasText: text })
      .filter({ hasNot: main.locator('span') })
  for (const [mark, expected] of [
    ['#', 'rgb(234, 154, 151)'],
    ['-', foam],
    ['[x]', foam],
    ['[ ]', foam],
    ['**', iris],
    ['`', 'rgb(234, 154, 151)'],
    ['[', iris],
    ['>', foam]
  ]) {
    const marker = main.locator('.cm-content').getByText(mark, { exact: true }).first()
    check((await color(marker)) === expected, `Markdown marker must use its Moon role: ${mark}`)
  }
  check(
    (await color(token('Moon heading').first())) === iris,
    'Editor headings must match the preview'
  )
  check((await color(token('inline code').first())) === gold, 'Editor code must match the preview')
  check((await color(token('Moon link').first())) === foam, 'Editor links must match the preview')
  check(
    (await color(preview.locator('blockquote p'))) ===
      (await color(token('A quiet quotation.').first())),
    'Quotation text must match between editor and preview'
  )
  check(
    (await color(preview.locator('li p').first())) === (await color(token('First item').first())),
    'List text must match between editor and preview'
  )
  const background = await main
    .locator('body')
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  check(background === 'rgb(35, 33, 54)', 'Application background must use Moon base')
  const contrast = await main.evaluate(() => {
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
      'body',
      '.cm-content',
      '.markdown-preview h1',
      '.markdown-preview a',
      '.markdown-preview code',
      '.markdown-preview blockquote p',
      '.markdown-preview li p'
    ].map((selector) => {
      const element = document.querySelector(selector)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })
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
  for (const sample of contrast) {
    check(sample.ratio >= 4.5, `Insufficient text contrast for ${sample.selector}: ${sample.ratio}`)
  }
  const baseline = await main.evaluate(() =>
    JSON.parse(localStorage.getItem('moon-verification-baseline') || 'null')
  )
  if (baseline)
    check(JSON.stringify(geometry) === JSON.stringify(baseline), 'Typography or layout changed')
  await main.screenshot({ path: '/tmp/draftwrite-moon-after.png' })
  const pending = main.context().waitForEvent('page')
  await main.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = await pending
  await settings.getByRole('heading', { name: 'Typography' }).waitFor()
  check(
    (await settings
      .locator('body')
      .evaluate((element) => getComputedStyle(element).backgroundColor)) === background,
    'Settings must use the same Moon background'
  )
  await settings.screenshot({ path: '/tmp/draftwrite-moon-settings.png' })
  await settings.close()
  for (const entity of [
    { library: 'Stories', name: /Moon verification/ },
    { library: 'Articles', name: /Moon article/ },
    { library: 'Posts', name: /Moon post/ }
  ]) {
    await main.getByRole('button', { name: entity.library, exact: true }).click()
    await main.getByRole('listbox').getByRole('option', { name: entity.name }).click()
    await main.getByRole('button', { name: 'Split', exact: true }).click()
    await preview.getByRole('heading', { name: 'Moon heading', exact: true }).waitFor()
    check(
      (await color(preview.locator('h1'))) === iris,
      `${entity.library} preview lost Moon colors`
    )
    const editor = main.locator('.cm-content')
    await editor.focus()
    await main.keyboard.press('Control+Home')
    await main.keyboard.press('Shift+ArrowRight')
    check(
      (await main.evaluate(() => window.getSelection().toString())) === '#',
      'Text selection failed'
    )
    check(
      (await main
        .locator('.cm-selectionBackground')
        .first()
        .evaluate((element) => getComputedStyle(element).backgroundColor)) === 'rgb(68, 65, 90)',
      'Focused editor selection must use Moon highlight medium'
    )
    await main.keyboard.press('ArrowRight')
    await main.keyboard.type('X')
    await main.keyboard.press('Control+z')
    check(
      (await editor.innerText()).startsWith('# Moon heading'),
      'Undo did not restore the heading'
    )
  }
  const nested =
    '> **Quoted bold** and `quoted code` with [quoted link](https://example.com).\n\n- **Listed bold** and `listed code` with *listed emphasis*.\n\n1. Ordered item'
  await main.locator('.cm-content').fill(nested)
  try {
    await preview.getByText('Quoted bold', { exact: true }).waitFor()
    for (const [text, expected] of [
      ['Quoted bold', 'rgb(234, 154, 151)'],
      ['quoted code', gold],
      ['quoted link', foam],
      ['Listed bold', 'rgb(234, 154, 151)'],
      ['listed code', gold],
      ['listed emphasis', gold]
    ]) {
      check(
        (await color(token(text).first())) === expected,
        `Nested editor token lost its color: ${text}`
      )
      check(
        (await color(preview.getByText(text, { exact: true }))) === expected,
        `Nested preview lost its color: ${text}`
      )
    }
    check(
      (await color(main.locator('.cm-content').getByText('1.', { exact: true }))) === foam,
      'Ordered list numbers must use Moon foam'
    )
  } finally {
    await main.locator('.cm-content').fill(markdown)
  }
  check(errors.length === 0, `Renderer errors: ${errors.join('; ')}`)
  return {
    colors: 'Moon base, iris, foam, gold',
    geometryMatchesBaseline: !!baseline,
    contrast,
    entities: ['Story', 'Article', 'Post'],
    settings: true,
    selection: true,
    undo: true,
    errors
  }
}
