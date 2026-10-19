/* eslint-disable @typescript-eslint/no-require-imports -- this script is CommonJS by design */
const { cpSync, existsSync, mkdirSync, rmSync } = require('node:fs')
const { dirname, join } = require('node:path')

const source = join(
  __dirname,
  '..',
  'src',
  'main',
  'adapters',
  'persistence',
  'sqlite',
  'migrations'
)
const target = join(
  __dirname,
  '..',
  'out',
  'main',
  'adapters',
  'persistence',
  'sqlite',
  'migrations'
)

if (!existsSync(source)) {
  throw new Error(`sqlite migrations folder not found: ${source}`)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(dirname(target), { recursive: true })
cpSync(source, target, { recursive: true })

console.log(`Copied sqlite migrations to ${target}`)
