import * as commander from 'commander'
import colors from 'colors'
import { searchPathsForFile } from '../app-code/file-helper'
import { getConfigValue } from '../app-code/config-helper'

type ListOptions = {
  query?: string
  auth?: boolean
}

export function List() {
  const list = new commander.Command('list')
  list
    .description('List all packages available to swap between local and nuget')
    .option(
      '-q --query <query>',
      'Keyword to search through nuget feed. Required if auth is false',
    )
    .option('-a --auth', 'Whether to use nuget_feed and token stored in config')
    .action(ListPackages)

  return list
}

async function ListPackages(options: ListOptions, command: commander.Command) {
  const headers: HeadersInit = {}
  let url = ''
  if (options.auth) {
    const token = getConfigValue('token')
    headers['Authorization'] = `Bearer ${token}`

    const feed = getConfigValue('nuget_feed')
    url = `${feed}/query/`
  } else if (!options.query) {
    command.error(colors.red('Query is required when auth is not provided'))
  } else {
    url = 'https://azuresearch-usnc.nuget.org/query/'
  }

  const query = options.query
  if (query) {
    url += `?q=${query}`
  }

  const nugetResp = await fetch(url, {
    headers,
  }).then((response) => response.json())

  if (!nugetResp.data || nugetResp.data.length === 0) {
    console.log('No packages found.')
    return
  }

  console.log(colors.green('Available packages:'))
  for (const row of nugetResp.data) {
    console.log(`  - ${row.title}`)
    const csprojFiles = await searchPathsForFile(`${row.title}.csproj`)

    if (csprojFiles.length === 1) {
      console.log(colors.green(`  - Found csproj at ${csprojFiles[0]}`))
    } else if (csprojFiles.length > 1) {
      console.log(colors.yellow(`  - Found ${csprojFiles.length} csproj files`))
      for (const csprojFile of csprojFiles) {
        console.log(colors.yellow(`    - ${csprojFile}`))
      }
    } else {
      command.error(colors.red(`  - No csproj found on project path`))
    }
  }
}
