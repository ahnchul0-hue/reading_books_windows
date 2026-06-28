import { describe, it, expect } from 'vitest'
import { appName } from '../../src/core/meta'

describe('toolchain', () => {
  it('exposes app name', () => {
    expect(appName()).toBe('Reading Trainer')
  })
})
