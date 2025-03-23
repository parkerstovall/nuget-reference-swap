import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getObjectFromXml, packageConfig } from '../app-code/xml-helper'

const netFrameworkPackagesXml = `<?xml version="1.0" encoding="utf-8"?>
<packages>
  <package id="Antlr" version="3.5.0.2" targetFramework="net48" />
  <package id="bootstrap" version="3.3.7" targetFramework="net48" />
  <package id="EntityFramework" version="6.4.4" targetFramework="net48" />
  <package id="jQuery" version="3.3.1" targetFramework="net48" />
</packages>`

test('Check package config', { concurrency: true }, async () => {
  const parsedContent = getObjectFromXml<packageConfig>(
    netFrameworkPackagesXml,
    false,
  )

  assert.equal(Array.isArray(parsedContent.packages.package), true)
  if (Array.isArray(parsedContent.packages.package)) {
    assert.equal(parsedContent.packages.package.length, 4)
    for (const pkg of parsedContent.packages.package) {
      assert.equal(typeof pkg['@_id'], 'string')
      assert.equal(typeof pkg['@_version'], 'string')
    }

    assert.equal(parsedContent.packages.package[0]['@_id'], 'Antlr')
  }
})
