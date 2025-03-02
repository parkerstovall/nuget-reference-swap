import * as commander from 'commander'
import * as fs from 'fs'
import colors from 'colors'
import {
  getNormalizedPaths,
  getOutPath,
  searchForCsProjRecursive,
  tryFindProjectListFromSlnFile,
} from '../Helpers/FileHelpers'
import path from 'path'
import { getCsProjFromXml } from '../Helpers/XMLHelpers'
import { execWrapper } from '../Helpers/ExecWrapper'
import { getConfigValue } from '../Helpers/ConfigHelper'

type SwapOptions = {
  source: string
  file: string
  name: string
  version: string
  recursionLevel: number
}

type Project = {
  name: string
  projectPath: string
  fullPath: string
}

type PackageSwapDetails = {
  local: boolean
  removePackageName: string
  addPackageName: string
  addPackageVersion: string
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

function getListOfProjects(
  slnPath: string,
  command: commander.Command,
): Project[] {
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

function swapPackageLocal(project: Project, details: PackageSwapDetails) {
  let found = false
  if (!fs.existsSync(project.fullPath)) {
    throw new Error(`File not found at ${project.fullPath}`)
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
        if (pkg['@_Include'] === details.removePackageName) {
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
    return
  }

  execWrapper(
    `dotnet remove ${project.fullPath} package ${details.removePackageName}`,
  )

  if (details.addPackageVersion !== 'latest') {
    execWrapper(
      `dotnet add ${project.fullPath} package ${details.addPackageName} --version ${details.addPackageVersion}`,
    )
  }

  execWrapper(
    `dotnet add ${project.fullPath} package ${details.addPackageName}`,
  )
}

function addNugetSource() {
  let envSource = getConfigValue('nuget_feed')
  if (!envSource.endsWith('index.json')) {
    if (!envSource.endsWith('/')) {
      envSource = `${envSource}/`
    }

    envSource = `${envSource}index.json`
  }

  const sources = execWrapper(`dotnet nuget list source`).toString()
  for (const source of sources.split('\n')) {
    if (source.trim() === envSource) {
      return
    }
  }

  execWrapper(
    `dotnet nuget add source ${envSource} -u nrs -n nrs_SOURCE -p ${getConfigValue('token')} --store-password-in-clear-text`,
  )
}

function getPackageSwapDetails(
  isLocal: boolean,
  packageName: string,
  csprojFile: string,
) {
  let removePackageName: string
  let addPackageName: string
  let addPackageVersion: string

  if (isLocal) {
    makeNugetPackage(packageName, csprojFile)
    addPackageVersion = '1.0.0'
    removePackageName = packageName
    addPackageName = `${packageName}_Localnrs_CLI`
  } else {
    addPackageName = packageName
    addNugetSource()
    addPackageVersion = 'latest'
    removePackageName = `${packageName}_Localnrs_CLI`
  }

  return {
    removePackageName,
    addPackageName,
    addPackageVersion,
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

  const packageSwapDetails = {
    local: options.source === 'l' || options.source === 'local',
    ...getPackageSwapDetails(
      options.source === 'l' || options.source === 'local',
      options.name,
      csprojFile,
    ),
  }

  for (const project of projectList) {
    swapPackageLocal(project, packageSwapDetails)
    execWrapper(`dotnet restore ${project.fullPath}`)
  }

  execWrapper('dotnet nuget locals all --clear')
}

function makeNugetPackage(name: string, csProj: string) {
  const projectPath = path.join(csProj, '../')
  const sources = execWrapper(`dotnet nuget list source`).toString()
  const outPath = getOutPath('out')
  if (!sources.includes(outPath)) {
    execWrapper(`dotnet nuget add source ${outPath}`)
  }

  execWrapper(`dotnet restore ${projectPath}`)
  execWrapper(`dotnet build ${projectPath}`)

  try {
    execWrapper(
      `dotnet pack ${projectPath} --configuration Debug --include-symbols --include-source -o ${outPath} -p:PackageVersion=1.0.0 -p:PackageID=${name}_Localnrs_CLI`,
    )
  } catch {
    console.log(colors.red('Pack failed.'))
    process.exit(1)
  }
}
