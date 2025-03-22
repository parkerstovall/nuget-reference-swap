import * as commander from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { getOutPath } from '../app-code/file-helper'
import { execWrapper } from '../app-code/exec-wrapper'

export function Clear() {
  const config = new commander.Command('clear')
  config
    .description('Clears all data from the tool')
    .option('-i --include-config')
    .action(clearCommand)

  return config
}

async function clearCommand({ includeConfig }: { includeConfig?: boolean }) {
  execWrapper('dotnet nuget remove source Localnrs_CLI')

  const dataPath = getOutPath()
  if (!fs.existsSync(dataPath)) {
    console.log('No data to clear.')
    return
  }

  if (includeConfig) {
    await new Promise((res, rej) => {
      fs.rm(dataPath, { recursive: true, force: true }, (err) => {
        if (err) {
          console.error('Error clearing data:', err)
          rej(err)
        } else {
          console.log('All data cleared.')
          res(true)
        }
      })
    })
  } else {
    const files = fs.readdirSync(dataPath)
    for (const file of files) {
      console.log(file)
      if (file !== 'config.json') {
        const filePath = path.join(dataPath, file)
        fs.unlinkSync(filePath)
      }
    }
    console.log('All data cleared except config file.')
  }
}
