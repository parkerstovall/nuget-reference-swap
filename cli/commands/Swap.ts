import * as commander from 'commander'
import * as fs from 'fs'
import colors from 'colors'
import {
  getNormalizedPaths,
  searchForCsProjRecursive,
  tryFindProjectListFromSlnFile,
} from '../Helpers/FileHelpers.js'
import path from 'path'
import { execSync } from 'child_process'

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

// function swapLocal(
//   parsedContent: csProjectXml,
//   options: SwapOptions//,
//   //packagePath: string,
// ) {
//   let itemGroups = parsedContent.Project.ItemGroup
//   if (!Array.isArray(itemGroups)) {
//     itemGroups = [itemGroups]
//   }

//   let foundLocal = false
//   itemGroups.map((itemGroup: ItemGroup) => {
//     if (itemGroup.PackageReference) {
//       foundLocal = true
//       itemGroup = tryRemovePackageReference(itemGroup, options.name)
//     }

//     return itemGroup
//   })
  
//   if(foundLocal) {
//     //installPackage(packagePath)
//   }

//   parsedContent.Project.ItemGroup = itemGroups
//   return parsedContent
// }

// function tryRemovePackageReference(itemGroup: ItemGroup, packageName: string) {
//   if (!itemGroup.PackageReference) {
//     return itemGroup
//   }

//   if (!Array.isArray(itemGroup.PackageReference)) {
//     itemGroup.PackageReference = [itemGroup.PackageReference]
//   }

//   itemGroup.PackageReference = itemGroup.PackageReference.filter(
//     (packageReference) => {
//       return (
//         packageReference['@_Include'].toLowerCase() !==
//         packageName.toLowerCase()
//       )
//     },
//   )

//   return itemGroup
// }

function SwapCommand(options: SwapOptions, command: commander.Command) {
  options.source = options.source.toLocaleLowerCase()
  options.file = options.file.trim()
  verifyOptions(options, command)

  //dotnet pack Locator --include-symbols -o out --include-source   
  const projectList = getListOfProjects(options.file, command)
  const csprojFile = searchForCsProjRecursive(options.name, 2)
  if (!csprojFile) {
    command.error(
      colors.red(
        'No csproj file found with that project name. Use the list command to debug',
      ),
    )
  }

  makeNugetPackage(csprojFile)

  for (const project of projectList) {
    if (!fs.existsSync(project.fullPath)) {
      command.error(colors.red(`File not found at ${project.fullPath}`))
    }

    execSync(`dotnet add ${project.fullPath} package ${options.name} --source out`)

    // let parsedContent = getCsProjFromXml(project.fullPath)
    // if (options.source === 'l' || options.source === 'local') {
    //   parsedContent = swapLocal(parsedContent, options, 'packagePath')
    // }

    // const newContent = getXmlFromJsObject(parsedContent)
    // fs.writeFileSync(project.fullPath, newContent)
  }
}

function makeNugetPackage(csProj: string) {
  const projectPath = path.join(csProj, '../')
  execSync(`dotnet nuget add source out`)
  execSync(`dotnet pack ${projectPath} --include-symbols -o out --include-source`)
}
