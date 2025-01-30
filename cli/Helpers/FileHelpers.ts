import * as fs from 'fs'
import path from 'path'
import { getCsProjFromXml } from './XMLHelpers.js'

export function tryFindCsProjFile(directory: string, projectName: string) {
  // Try to find the csproj file in the root of the project
  let csprojFile = path.join(directory, projectName + '.csproj')
  if (fs.existsSync(csprojFile)) {
    return csprojFile
  }

  // Try to find the csproj file in the project directory
  csprojFile = path.join(directory, projectName, projectName + '.csproj')

  if (fs.existsSync(csprojFile)) {
    return csprojFile
  }

  return null
}

function normalizePath(projectPath: string) {
  if (path.isAbsolute(projectPath)) {
    return projectPath
  }

  const repoDir = path.resolve(import.meta.dirname, '../../')
  return path.resolve(repoDir, projectPath)
}

export function getNormalizedPaths() {
  const paths = process.env.LOCAL_PACKAGE_PATH?.split(',') || []
  const newPaths = paths.map(normalizePath)
  return newPaths
}

export function tryFindDllFile(
  projectPath: string,
  projectName: string,
  targetFramework: string,
) {
  // Search for a project at the root
  let dllPath = path.join(
    projectPath,
    'bin',
    'Debug',
    targetFramework,
    projectName + '.dll',
  )

  if (fs.existsSync(dllPath)) {
    return dllPath
  }

  let releaseDllPath = dllPath.replace('Debug', 'Release')
  if (fs.existsSync(releaseDllPath)) {
    return releaseDllPath
  }

  // Search for a project in its own folder
  dllPath = path.join(
    projectPath,
    projectName,
    'bin',
    'Debug',
    targetFramework,
    projectName + '.dll',
  )

  if (fs.existsSync(dllPath)) {
    return dllPath
  }

  releaseDllPath = dllPath.replace('Debug', 'Release')
  if (fs.existsSync(releaseDllPath)) {
    return releaseDllPath
  }

  return null
}

export function tryFindProjectListFromSlnFile(
  projectPath: string,
  filePath: string,
) {
  let content = ''
  const slnPath = path.join(projectPath, filePath)
  if (slnPath.endsWith('.sln')) {
    if (!fs.existsSync(slnPath)) {
      return null
    }

    content = fs.readFileSync(slnPath, 'utf8')
  } else {
    const files = fs.readdirSync(slnPath)
    const slnFile = files.find((file) => file.endsWith('.sln'))
    if (!slnFile) {
      return null
    }

    content = fs.readFileSync(path.join(slnPath, slnFile), 'utf8')
  }

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
      const fullPath = path.join(slnPath.replace('.sln', ''), projectPath)

      return {
        name: match[1],
        projectPath,
        fullPath,
      }
    })
    .filter((project) => project !== null)

  return projectPaths
}

export function getDirectories(source: string): string[] {
  return fs.readdirSync(source).filter((name) => {
    return fs.statSync(path.join(source, name)).isDirectory()
  })
}

export function tryFindTargetFramework(csprojPath: string) {
  const csProj = getCsProjFromXml(csprojPath)
  return csProj.Project.PropertyGroup.TargetFramework
}

export function searchForDllRecusive(projectName: string, maxLevel: number) {
  const projectPaths = getNormalizedPaths()
  for (const projectPath of projectPaths) {
    const dllPath = searchForDllRecusiveLoop(projectName, projectPath, maxLevel)
    if (dllPath) {
      return dllPath
    }
  }

  return null
}

function searchForDllRecusiveLoop(
  projectName: string,
  currDirectory: string,
  maxLevel: number,
  currentLevel: number = 0,
): string | null {
  const directories = getDirectories(currDirectory)
  if (
    (maxLevel !== -1 && currentLevel >= maxLevel) ||
    directories.length === 0
  ) {
    return searchDirectoryForProjectDll(projectName, currDirectory)
  }

  const len = directories.length
  let i = 0
  for (i = 0; i < len; i++) {
    const directory = path.join(currDirectory, directories[i])
    let dllPath = searchDirectoryForProjectDll(projectName, directory)
    if (dllPath) {
      return dllPath
    }

    dllPath = searchForDllRecusiveLoop(
      projectName,
      directory,
      maxLevel,
      currentLevel + 1,
    )
    if (dllPath) {
      return dllPath
    }
  }

  return null
}

export function searchDirectoryForProjectDll(
  projectName: string,
  directory: string,
) {
  const csprojFile = tryFindCsProjFile(directory, projectName)
  if (!csprojFile) {
    return null
  }

  const targetFramework = tryFindTargetFramework(csprojFile)
  if (!targetFramework) {
    return null
  }

  const dllPath = tryFindDllFile(directory, projectName, targetFramework)
  if (dllPath) {
    return dllPath
  }

  return null
}

export function searchProjectPathForDll(projectName: string) {
  const projectPaths = getNormalizedPaths()
  for (const projectPath of projectPaths) {
    const dllPath = searchDirectoryForProjectDll(projectName, projectPath)
    if (dllPath) {
      return dllPath
    }
  }

  return null
}
