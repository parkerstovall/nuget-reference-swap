import path from 'path'
import colors from 'colors'
import * as fs from 'fs'
import { getConfigValue } from './config-helper'
import { execWrapper } from './exec-wrapper'
import { getOutPath } from './file-helper'
import { csProjectXml, getObjectFromXml, packageConfig } from './xml-helper'

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

export class NugetManager {
  private readonly IsDotNetFramework: boolean
  private readonly nugetCmd: string

  constructor(IsDotNetFramework: boolean) {
    this.IsDotNetFramework = IsDotNetFramework

    if (IsDotNetFramework) {
      this.nugetCmd = getConfigValue('nuget_exe')
    } else {
      this.nugetCmd = 'dotnet nuget'
    }

    if (this.IsDotNetFramework && !getConfigValue('nuget_exe')) {
      throw new Error(
        'Path to Nuget.Exe not set. Please set nuget_exe in the config.',
      )
    }
  }

  getPackageSwapDetails(
    packageName: string,
    csprojFile: string,
    isLocal?: boolean,
    auth?: boolean,
  ) {
    let removePackageName: string
    let addPackageName: string

    if (isLocal) {
      this.makeNugetPackage(packageName, csprojFile)
      removePackageName = packageName
      addPackageName = `${packageName}_Localnrs_CLI`
    } else {
      addPackageName = packageName
      removePackageName = `${packageName}_Localnrs_CLI`

      if (auth) {
        this.addNugetSource()
      }
    }

    return {
      removePackageName,
      addPackageName,
    }
  }

  swapPackage(project: Project, details: PackageSwapDetails): void {
    if (this.IsDotNetFramework) {
      this.swapPackageFramework(project, details)
    } else {
      this.swapPackageCore(project, details)
    }
  }

  addNugetSource(): void {
    let envSource = getConfigValue('nuget_feed')

    if (!envSource.endsWith('index.json')) {
      if (!envSource.endsWith('/')) {
        envSource = `${envSource}/`
      }

      envSource = `${envSource}index.json`
    }

    const sources = execWrapper(`${this.nugetCmd} list source`).toString()
    for (const source of sources.split('\n')) {
      if (source.trim() === envSource) {
        return
      }
    }

    execWrapper(
      `${this.nugetCmd} add source ${envSource} -u nrs -p ${getConfigValue('token')} --store-password-in-clear-text`,
    )
  }

  makeNugetPackage(packageName: string, csProj: string): void {
    const projectPath = path.join(csProj, '../')
    const sources = execWrapper(`${this.nugetCmd} list source`).toString()
    const outPath = getOutPath()
    if (!sources.includes(outPath)) {
      execWrapper(`${this.nugetCmd} add source ${outPath} -n Localnrs_CLI`)
    }

    try {
      execWrapper(
        `${this.nugetCmd} pack ${projectPath} --configuration Debug --include-symbols --include-source -o ${outPath} -p:PackageVersion=1.0.0 -p:PackageID=${packageName}_Localnrs_CLI`,
      )
    } catch {
      console.log(colors.red('Pack failed.'))
      process.exit(1)
    }
  }

  private swapPackageCore(project: Project, details: PackageSwapDetails) {
    let found = false
    if (!fs.existsSync(project.fullPath)) {
      throw new Error(`File not found at ${project.fullPath}`)
    }

    const parsedContent = getObjectFromXml<csProjectXml>(project.fullPath)
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

  private swapPackageFramework(project: Project, details: PackageSwapDetails) {
    let found = false
    if (!fs.existsSync(project.fullPath)) {
      throw new Error(`File not found at ${project.fullPath}`)
    }

    const packagesConfigPath = path.join(
      project.fullPath,
      '../',
      'packages.config',
    )

    if (!fs.existsSync(packagesConfigPath)) {
      return
    }

    const parsedContent = getObjectFromXml<packageConfig>(packagesConfigPath)
    let packages = parsedContent.packages.package
    if (!Array.isArray(packages)) {
      packages = [packages]
    }

    for (const pkg of packages) {
      if (pkg['@_id'] === details.removePackageName) {
        found = true
        break
      }
    }

    if (!found) {
      return
    }

    // Remove the package from packages.config
    const uninstallPackageCmd = `powershell -Command "Uninstall-Package -Name ${details.removePackageName} -ProjectName ${project.name} -RemoveDependencies -Force"`
    execWrapper(uninstallPackageCmd)

    // Add the new package to packages.config
    const installPackageCmd = `powershell -Command "Install-Package -Name ${details.addPackageName} -ProjectName ${project.name} -Source Localnrs_CLI"`
    execWrapper(installPackageCmd)
  }
}
