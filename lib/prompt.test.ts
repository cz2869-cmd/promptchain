import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fill,
  formatCafe,
  formatCatalog,
  inputNeeds,
  moved,
  parseOutput,
  tokensIn,
  validateRun,
} from './prompt.ts'

test('fill substitutes known tokens and leaves the rest', () => {
  const text = fill('Vibes: {{vibes}}. Note: {{ note }}. Cafe: {{cafe}}.', {
    vibes: 'Cozy',
    note: 'a window',
  })
  assert.equal(text, 'Vibes: Cozy. Note: a window. Cafe: {{cafe}}.')
})

test('tokens decide which inputs the runner asks for', () => {
  const suggest = tokensIn(['{{vibes}}', 'What they wrote: {{note}}.\n{{catalog}}'])
  assert.deepEqual(inputNeeds(suggest), { vibes: true, cafe: false, freeform: false })

  const read = tokensIn(['Cafe:\n{{cafe}}'])
  assert.deepEqual(inputNeeds(read), { vibes: false, cafe: true, freeform: false })

  const open = tokensIn(['Describe {{input}} and then rewrite {{previous}}.'])
  assert.deepEqual(inputNeeds(open), { vibes: false, cafe: false, freeform: true })
})

test('validateRun matches the cafe directions', () => {
  const suggest = tokensIn(['{{vibes}} {{note}} {{catalog}}'])
  assert.equal(
    validateRun(suggest, { vibes: [], note: '', cafeId: null }),
    'Pick a vibe, or write what you are looking for.'
  )
  assert.equal(validateRun(suggest, { vibes: ['Studying'], note: '', cafeId: null }), null)

  const read = tokensIn(['{{cafe}}'])
  assert.equal(validateRun(read, { vibes: [], note: '', cafeId: null }), 'Choose a cafe.')
  assert.equal(validateRun(read, { vibes: [], note: '', cafeId: 4 }), null)
})

test('moved swaps a step with its neighbor', () => {
  assert.deepEqual(moved(['a', 'b', 'c'], 1, 'up'), ['b', 'a', 'c'])
  assert.deepEqual(moved(['a', 'b', 'c'], 0, 'down'), ['b', 'a', 'c'])
  assert.equal(moved(['a'], 0, 'up'), null)
})

test('catalog and cafe blocks stay readable for the model', () => {
  const catalog = formatCatalog([
    {
      id: 2,
      name: "Joe's Coffee",
      vibe: 'Between-class fuel',
      address: '550 W 120th St',
      description: 'A Columbia staple.',
    },
  ])
  assert.match(catalog, /^2 \| Joe's Coffee \| Between-class fuel/)
  assert.match(formatCafe({
    name: "Joe's Coffee",
    vibe: 'Between-class fuel',
    address: '550 W 120th St',
    neighborhood: 'Morningside Heights',
    description: 'A Columbia staple.',
  }), /Vibe on file: Between-class fuel/)
})

test('parseOutput reads a cafe pick, a vibe portrait, and a caption list', () => {
  const cafes = [
    { id: 2, name: "Joe's Coffee" },
    { id: 8, name: 'The Hungarian Pastry Shop' },
  ]
  const pick = parseOutput(
    'Sure. {"id": 8, "reason": "Enough room to stay for two hours."}',
    cafes
  )
  assert.equal(pick.pick?.name, 'The Hungarian Pastry Shop')
  assert.equal(pick.read, null)

  const read = parseOutput(
    '{"vibes": ["Studying", "Quiet corner"], "description": "A study cave with pastry."}',
    cafes
  )
  assert.deepEqual(read.read?.vibes, ['Studying', 'Quiet corner'])
  assert.match(read.read?.description ?? '', /study cave/)

  const lines = parseOutput('["one", "two", "three"]', cafes)
  assert.deepEqual(lines.lines, ['one', 'two', 'three'])
})
