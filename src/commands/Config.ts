import * as commander from 'commander'
import * as fs from 'fs'
import { getOutPath } from '../Helpers/FileHelpers'
import { getConfig } from '../Helpers/ConfigHelper'

type ConfigOptions = {
  key: string
  value?: string
}

export function Config() {
  const config = new commander.Command('config')
  config
    .description('Gets or sets the configuration')
    .requiredOption('-k --key <key>', 'The key of the configuration')
    .option('-v --value <value>', '(Optional) The value of the configuration')
    .action(setConfig)

  return config
}

function setConfig(options: ConfigOptions) {
  const config = getConfig()

  if (options.value) {
    config[options.key] = options.value
    const configPath = getOutPath('config.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
    console.log(`Configuration ${options.key} set to ${options.value}`)
  } else if (config[options.key]) {
    console.log(`Configuration ${options.key} is set to ${config[options.key]}`)
  } else {
    console.log(`Configuration ${options.key} is unset`)
  }
}
