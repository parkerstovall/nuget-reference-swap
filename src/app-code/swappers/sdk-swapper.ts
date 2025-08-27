import path from 'path'
import colors from 'colors'
import * as fs from 'fs'
import { getConfigValue } from '../config-helper'
import { execWrapper } from '../exec-wrapper'
import { getOutPath } from '../file-helper'
import { csProjectXml, getObjectFromXml } from '../xml-helper'
import { Project, PackageSwapDetails } from '../types'

export class SdkSwapper {
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

  addNugetSource(): void {
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

  makeNugetPackage(packageName: string, csProj: string): void {
    const projectPath = path.join(csProj, '../')
    const sources = execWrapper(`dotnet nuget list source`).toString()
    const outPath = getOutPath()
    if (!sources.includes(outPath)) {
      execWrapper(`dotnet nuget add source ${outPath} -n Localnrs_CLI`)
    }

    try {
      execWrapper(
        `dotnet nuget pack ${projectPath} --configuration Debug --include-symbols --include-source -o ${outPath} -p:PackageVersion=1.0.0 -p:PackageID=${packageName}_Localnrs_CLI`,
      )
    } catch {
      console.log(colors.red('Pack failed.'))
      process.exit(1)
    }
  }

  swapPackage(project: Project, details: PackageSwapDetails) {
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
}
