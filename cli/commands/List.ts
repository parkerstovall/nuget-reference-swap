import * as commander from 'commander'
import colors from 'colors'
import {
  searchForDllRecusive,
  searchProjectPathForDll,
} from '../Helpers/FileHelpers.js'

type ListOptions = {
  query?: string
  recursionLevel?: number
}

export function List() {
  const list = new commander.Command('list')
  list
    .description('List all packages available to swap between local and nuget')
    .option('-q --query <query>', 'Keyword to search through nuget feed')
    .option(
      '-r --recursion-level <recursionLevel>',
      'How many levels of recursion should the command search on the project path to find the local package. -1 for no limit',
      parseFloat,
      1,
    )
    .action(ListPackages)

  return list
}

async function ListPackages(options: ListOptions, command: commander.Command) {
  const token = process.env.GIT_TOKEN
  const feed = process.env.NUGET_FEED
  let url = `${feed}/query/`

  const query = options.query
  if (query) {
    url += `?q=${query}`
  }

  const data = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((response) => response.json())

  if (!data.data || data.data.length === 0) {
    console.log('No packages found.')
    return
  }

  console.log(colors.green('Available packages:'))
  for (const row of data.data) {
    console.log(row.title)
    if (row.title === 'DbLocator') continue
    let dllPath = searchProjectPathForDll(row.title)

    if (!dllPath && options.recursionLevel) {
      dllPath = searchForDllRecusive(row.title, options.recursionLevel)
    }

    if (dllPath) {
      console.log(colors.green(`  - Found dll at ${dllPath}`))
    } else {
      command.error(colors.red(`  - No dll found on project path`))
    }
  }
}
