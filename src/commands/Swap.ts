import * as commander from 'commander'
import colors from 'colors'
import {
  isNetFramework,
  searchPathsForFile,
  tryFindProjectListFromSlnFile,
} from '../app-code/file-helper'
import { execWrapper } from '../app-code/exec-wrapper'
import { SdkSwapper } from '../app-code/swappers/sdk-swapper'

type SwapOptions = {
  solution: string
  name: string
  local?: boolean
  auth?: boolean
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

  if (!isNetFramework(csprojFiles[0])) {
    await swapCore(options, command, csprojFiles[0])
  } else {
    //await swapFramework(options, command, csprojFiles[0])
  }
}

async function swapCore(
  options: SwapOptions,
  command: commander.Command,
  csprojFile: string,
) {
  const nugetManager = new SdkSwapper()
  const packageSwapDetails = {
    local: options.local,
    ...nugetManager.getPackageSwapDetails(
      options.name,
      csprojFile,
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
    nugetManager.swapPackage(project, packageSwapDetails)
    execWrapper(`dotnet restore ${project.fullPath}`)
  }

  execWrapper('dotnet nuget locals all --clear')
}

// async function swapFramework(
//   options: SwapOptions,
//   command: commander.Command,
//   csprojFile: string,
// ) {}
