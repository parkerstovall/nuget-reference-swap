import { getOutPath } from './file-helper'
import * as fs from 'fs'

export function getConfig(): Record<string, string> {
  const configPath = getOutPath('config.json')
  if (!fs.existsSync(configPath)) {
    return {}
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch {
    return {}
  }
}

export function getConfigValue(key: string) {
  const config = getConfig()
  if (!config[key]) {
    throw new Error(`Configuration ${key} is unset`)
  }
  return config[key]
}
