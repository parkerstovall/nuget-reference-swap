import * as commander from 'commander'
import * as fs from 'fs'
import colors from 'colors'
import {
  getNormalizedPaths,
  searchForCsProjRecursive,
  tryFindProjectListFromSlnFile,
} from '../Helpers/FileHelpers'
import path from 'path'
import { getCsProjFromXml } from '../Helpers/XMLHelpers'
import { execWrapper } from '../Helpers/ExecWrapper'

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

function SwapCommand(options: SwapOptions, command: commander.Command) {
  options.source = options.source.toLocaleLowerCase()
  options.file = options.file.trim()
  verifyOptions(options, command)

  const projectList = getListOfProjects(options.file, command)
  const csprojFile = searchForCsProjRecursive(options.name, 2)
  if (!csprojFile) {
    command.error(
      colors.red(
        'No csproj file found with that project name. Use the list command to debug',
      ),
    )
  }

  const [pkgSource, pkgName] = makeNugetPackage(options.name, csprojFile)

  for (const project of projectList) {
    let found = false
    if (!fs.existsSync(project.fullPath)) {
      command.error(colors.red(`File not found at ${project.fullPath}`))
    }

    const parsedContent = getCsProjFromXml(project.fullPath)
    let itemGroups = parsedContent.Project.ItemGroup
    if (!Array.isArray(itemGroups)) {
      itemGroups = [itemGroups]
    }

    for (const itemGroup of itemGroups) {
      if (itemGroup.PackageReference) {
        if (!Array.isArray(itemGroup.PackageReference)) {
          itemGroup.PackageReference = [itemGroup.PackageReference]
        }

        for (const pkg of itemGroup.PackageReference) {
          if (pkg['@_Include'] === options.name) {
            found = true
            break
          }
        }
      }
      if (found) {
        break
      }
    }

    if (!found) {
      continue
    }

    execWrapper(`dotnet remove ${project.fullPath} package ${options.name}`)

    execWrapper(
      `dotnet add ${project.fullPath} package ${pkgName} --source ${pkgSource} --version 1.0.0`,
    )

    execWrapper(`dotnet restore ${project.fullPath}`)
  }

  execWrapper('dotnet nuget locals all --clear')
}

function makeNugetPackage(name: string, csProj: string) {
  const projectPath = path.join(csProj, '../')
  const sources = execWrapper(`dotnet nuget list source`).toString()
  const outPath = path.join(__dirname, '../', '../', 'out')
  if (!sources.includes('LocalPRM_CLI')) {
    execWrapper(`dotnet nuget add source ${outPath}`)
  }

  try {
    execWrapper(`dotnet build ${projectPath}`)
  } catch {
    console.log(colors.red('Build failed.'))
    process.exit(1)
  }

  const pkgPath = path.join(outPath, `${name}_LocalPRM_CLI.1.0.0.nupkg`)
  if (fs.existsSync(pkgPath)) {
    fs.rmSync(pkgPath)
  }

  const symbPath = path.join(
    outPath,
    `${name}_LocalPRM_CLI.1.0.0.symbols.nupkg`,
  )
  if (fs.existsSync(symbPath)) {
    fs.rmSync(symbPath)
  }

  try {
    execWrapper(
      `dotnet pack ${projectPath} --configuration Debug --include-symbols --include-source -o ${outPath} -p:PackageVersion=1.0.0 -p:PackageID=${name}_LocalPRM_CLI`,
    )
  } catch {
    console.log(colors.red('Pack failed.'))
    process.exit(1)
  }

  return [outPath, `${name}_LocalPRM_CLI`]
}
