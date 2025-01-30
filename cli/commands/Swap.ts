import * as commander from 'commander'
import * as fs from 'fs'
import colors from 'colors'
import {
  getNormalizedPaths,
  searchForDllRecusive,
  tryFindProjectListFromSlnFile,
} from '../Helpers/FileHelpers.js'
import {
  csProjectXml,
  getCsProjFromXml,
  getXmlFromJsObject,
  ItemGroup,
} from '../Helpers/XMLHelpers.js'

type SwapOptions = {
  source: string
  file: string
  name: string
  version: string
  recursionLevel: number
}

export function Swap() {
  const swap = new commander.Command('swap')
  swap
    .description('Swap package references between local and nuget sources')
    .requiredOption(
      '-s, --source <source>',
      '(Required) Source to swap to <l, local> or <n, nuget>',
    )
    .requiredOption('-f, --file <file>', '(Required) Path to the solution file')
    .requiredOption(
      '-n --name <name>',
      '(Required) Name of the project to swap. Use list command to find available options',
    )
    .option(
      '-v --version <version>',
      'Version of the package to swap.',
      '@Latest',
    )
    .option(
      '-r --recursion-level <recursionLevel>',
      'How many levels of recursion should the command search on the project path to find the local package. -1 for no limit',
      parseFloat,
      1,
    )
    .action(SwapCommand)

  return swap
}

function getListOfProjects(slnPath: string, command: commander.Command) {
  const projectPaths = getNormalizedPaths()
  let projects: { name: string; projectPath: string; fullPath: string }[] = []
  for (const projectPath of projectPaths) {
    const tempProjects = tryFindProjectListFromSlnFile(projectPath, slnPath)
    if (!tempProjects || tempProjects.length === 0) {
      continue
    }

    projects = tempProjects
    break
  }

  if (projects.length === 0) {
    command.error(colors.red('No projects found in the solution file'))
  }

  return projects
}

function verifyOptions(options: SwapOptions, command: commander.Command) {
  const acceptedSources = ['l', 'n', 'local', 'nuget']
  if (!acceptedSources.includes(options.source)) {
    command.error(
      colors.red(
        "Invalid value for source. Supported Values: {'l', 'local', 'n', 'nuget'}",
      ),
    )
  }
}

function swapLocal(
  parsedContent: csProjectXml,
  options: SwapOptions,
  dllPath: string,
) {
  let itemGroups = parsedContent.Project.ItemGroup
  if (!Array.isArray(itemGroups)) {
    itemGroups = [itemGroups]
  }

  let foundLocal = false
  itemGroups.map((itemGroup: ItemGroup) => {
    itemGroup = tryRemovePackageReference(itemGroup, options.name)
    if (itemGroup.ProjectReference) {
      foundLocal = true
      itemGroup = tryAddLocalReference(itemGroup, dllPath)
    }

    return itemGroup
  })

  if (!foundLocal) {
    itemGroups.push({
      ProjectReference: {
        '@_Include': dllPath,
      },
    })
  }

  parsedContent.Project.ItemGroup = itemGroups
  return parsedContent
}

function tryRemovePackageReference(itemGroup: ItemGroup, packageName: string) {
  if (!itemGroup.PackageReference) {
    return itemGroup
  }

  if (!Array.isArray(itemGroup.PackageReference)) {
    itemGroup.PackageReference = [itemGroup.PackageReference]
  }

  itemGroup.PackageReference = itemGroup.PackageReference.filter(
    (packageReference) => {
      return (
        packageReference['@_Include'].toLowerCase() !==
        packageName.toLowerCase()
      )
    },
  )

  return itemGroup
}

function tryAddLocalReference(itemGroup: ItemGroup, dllPath: string) {
  if (!itemGroup.ProjectReference) {
    return itemGroup
  }

  if (!Array.isArray(itemGroup.ProjectReference)) {
    itemGroup.ProjectReference = [itemGroup.ProjectReference]
  }

  itemGroup.ProjectReference.push({
    '@_Include': dllPath,
  })

  return itemGroup
}

function SwapCommand(options: SwapOptions, command: commander.Command) {
  options.source = options.source.toLocaleLowerCase()
  verifyOptions(options, command)

  const projectList = getListOfProjects(options.file, command)
  const dllPath = searchForDllRecusive(options.name, options.recursionLevel)
  if (!dllPath) {
    command.error(
      colors.red(
        'No DLL file found with that project name. Use the list command to debug',
      ),
    )
  }

  for (const project of projectList) {
    if (!fs.existsSync(project.fullPath)) {
      command.error(colors.red(`File not found at ${project.fullPath}`))
    }
    let parsedContent = getCsProjFromXml(project.fullPath)
    if (options.source === 'l' || options.source === 'local') {
      parsedContent = swapLocal(parsedContent, options, dllPath)
    }

    const newContent = getXmlFromJsObject(parsedContent)
    fs.writeFileSync(project.fullPath, newContent)
  }
}
