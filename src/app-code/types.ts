export type Project = {
  name: string
  projectPath: string
  fullPath: string
}

export type PackageSwapDetails = {
  removePackageName: string
  addPackageName: string
  local?: boolean
}

export type ReferenceSwapDetails = {
  removeReferenceName: string
  addReferencePath: string
}
