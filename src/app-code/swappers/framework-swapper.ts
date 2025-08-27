import { Project, ReferenceSwapDetails } from '../types'
import * as fs from 'fs'
import path from 'path'
import { csProjectXml, getObjectFromXml, packageConfig } from '../xml-helper'

export class FrameworkSwapper {
  swapPackage(project: Project, details: ReferenceSwapDetails) {
    if (!fs.existsSync(project.fullPath)) {
      return
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

    let found = false
    for (const pkg of packages) {
      if (pkg['@_id'] === details.removeReferenceName) {
        found = true
        break
      }
    }

    if (!found) {
      return
    }

    // Remove package reference from csproj file
    const csProj = getObjectFromXml<csProjectXml>(project.fullPath)
    let itemGroups = csProj.Project.ItemGroup
    if (!Array.isArray(itemGroups)) {
      itemGroups = [itemGroups]
    }

    for (const itemGroup of itemGroups) {
      if (itemGroup.Reference) {
        if (!Array.isArray(itemGroup.Reference)) {
          itemGroup.Reference = [itemGroup.Reference]
        }

        itemGroup.Reference = itemGroup.Reference.filter(
          (ref) => !ref['@_Include'].startsWith(details.removeReferenceName),
        )
      }
    }
  }
}
