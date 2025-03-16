import * as fs from 'fs'
import { glob } from 'glob'
import path from 'path'
import { getCsProjFromXml } from './xml-helper'
import { getConfigValue } from './config-helper'

export function getOutPath(newPath: string) {
  let normalPath = path.join(__dirname, '../', newPath)
  if (process.platform === 'win32') {
    normalPath = normalPath.replace(/\\/g, '/')
  }

  return normalPath
}

function normalizePath(newPath: string) {
  if (path.isAbsolute(newPath)) {
    return newPath.trim()
  }

  let normalPath = path.join(process.cwd(), newPath)
  if (process.platform === 'win32') {
    normalPath = normalPath.replace(/\\/g, '/')
  }

  return normalPath
}

export function getNormalizedPaths() {
  const paths = getConfigValue('search_path')?.split(',') || []
  const newPaths = paths.map(normalizePath)
  return newPaths
}

export async function tryFindProjectListFromSlnFile(solution: string) {
  const solutionFiles = await searchPathsForFile(`${solution}.sln`)
  if (solutionFiles.length !== 1) {
    return null
  }

  const content = fs.readFileSync(solutionFiles[0], 'utf8')

  const projects = content.match(/Project.* = "(.*?)", "(.*?)"/g)
  if (!projects) {
    return null
  }

  const projectPaths = projects
    .map((project) => {
      const match = project.match(/Project.* = "(.*?)", "(.*?)"/)
      if (!match) {
        return null
      }

      const projectPath = match[2].replace(/\\/g, '/')
      const fullPath = path.join(
        solutionFiles[0].replace('.sln', ''),
        '../',
        projectPath,
      )

      return {
        name: match[1],
        projectPath,
        fullPath,
      }
    })
    .filter((project) => project !== null)

  return projectPaths
}

export function tryFindTargetFramework(csprojPath: string) {
  const csProj = getCsProjFromXml(csprojPath)
  return csProj.Project.PropertyGroup.TargetFramework
}

export async function searchPathsForFile(...searchPaths: string[]) {
  const searchPath = path.join(...searchPaths)
  const projectPaths = getNormalizedPaths()
  const globs: string[] = []
  const promises: Promise<string[]>[] = []
  for (const projectPath of projectPaths) {
    const globPath = path.join(projectPath, '**', searchPath)
    promises.push(
      glob(globPath, {
        absolute: true,
        nodir: true,
        ignore: ['node_modules/**', 'bin/**', 'dist/**', 'obj/**'],
      }),
    )
  }

  const results = await Promise.all(promises)
  for (const result of results) {
    if (result.length > 0) {
      globs.push(...result)
    }
  }

  return globs
}
