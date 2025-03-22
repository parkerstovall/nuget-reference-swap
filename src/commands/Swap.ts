import * as commander from 'commander'
import * as fs from 'fs'
import colors from 'colors'
import {
  getOutPath,
  searchPathsForFile,
  tryFindProjectListFromSlnFile,
} from '../app-code/file-helper'
import path from 'path'
import { getCsProjFromXml } from '../app-code/xml-helper'
import { execWrapper } from '../app-code/exec-wrapper'
import { getConfigValue } from '../app-code/config-helper'

type SwapOptions = {
  solution: string
  name: string
  local?: boolean
  auth?: boolean
}

type Project = {
  name: string
  projectPath: string
  fullPath: string
}

type PackageSwapDetails = {
  removePackageName: string
  addPackageName: string
  local?: boolean
}

export function Swap() {
  const swap = new commander.Command('swap')
  swap
    .description('Swap package references between local and nuget sources')
    .requiredOption(
      '-s, --solution <solution>',
      '(Required) Solution name to swap packages in',
    )
    .requiredOption(
      '-n --name <name>',
      '(Required) Name of the project to swap. Use list command to find available options',
    )
    .option(
      '-l, --local',
      '(Required) Whether to swap to the local or nuget package',
    )
    .option('-a --auth', 'Whether to use nuget_feed and token stored in config')
    .action(SwapCommand)

  return swap
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
    `dotnet nuget add source ${envSource} -u nrs -p ${getConfigValue('token')} --store-password-in-clear-text`,
  )
}

function getPackageSwapDetails(
  packageName: string,
  csprojFile: string,
  isLocal?: boolean,
  auth?: boolean,
) {
  let removePackageName: string
  let addPackageName: string

  if (isLocal) {
    makeNugetPackage(packageName, csprojFile)
    removePackageName = packageName
    addPackageName = `${packageName}_Localnrs_CLI`
  } else {
    addPackageName = packageName
    removePackageName = `${packageName}_Localnrs_CLI`

    if (auth) {
      addNugetSource()
    }
  }

  return {
    removePackageName,
    addPackageName,
  }
}

async function SwapCommand(options: SwapOptions, command: commander.Command) {
  const csprojFiles = await searchPathsForFile(`${options.name}.csproj`)
  if (csprojFiles.length < 1) {
    command.error(
      colors.red(
        'No csproj file found with that project name. Use the list command to debug',
      ),
    )
  } else if (csprojFiles.length > 1) {
    command.error(
      colors.red(
        'Multiple csproj files found with that project name. Use the list command to debug',
      ),
    )
  }

  const packageSwapDetails = {
    local: options.local,
    ...getPackageSwapDetails(
      options.name,
      csprojFiles[0],
      options.local,
      options.auth,
    ),
  }

  const projectList = await tryFindProjectListFromSlnFile(options.solution)
  if (!projectList || projectList.length === 0) {
    command.error(colors.red(`Solution file not found: ${options.solution}`))
  }

  for (const project of projectList) {
    console.log(`Swapping package at ${project.fullPath}...`)
    swapPackageLocal(project, packageSwapDetails)
    execWrapper(`dotnet restore ${project.fullPath}`)
  }

  execWrapper('dotnet nuget locals all --clear')
}

function makeNugetPackage(name: string, csProj: string) {
  const projectPath = path.join(csProj, '../')
  const sources = execWrapper(`dotnet nuget list source`).toString()
  const outPath = getOutPath()
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
