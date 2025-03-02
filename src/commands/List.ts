import * as commander from 'commander'
import colors from 'colors'
import { searchForCsProjRecursive } from '../Helpers/FileHelpers'
import { getConfigValue } from '../Helpers/ConfigHelper'

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
  const token = getConfigValue('token')
  const feed = getConfigValue('nuget_feed')
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
    const csproj = searchForCsProjRecursive(
      row.title,
      options.recursionLevel ?? 0,
    )

    if (csproj) {
      console.log(colors.green(`  - Found csproj at ${csproj}`))
    } else {
      command.error(colors.red(`  - No csproj found on project path`))
    }
  }
}
