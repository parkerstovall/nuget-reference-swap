import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs'

export type PackageReference = {
  '@_Include': string
  '@_Version': string
}

export type ProjectReference = {
  '@_Include': string
  HintPath: string
}

export type ItemGroup = {
  PackageReference?: PackageReference | PackageReference[]
  Reference?: ProjectReference | ProjectReference[]
}

type PropertyGroup = {
  TargetFramework?: string
  TargetFrameworkVersion?: string
}

// There is a lot more to the csproject file, I just don't need it.
export type csProjectXml = {
  Project: {
    PropertyGroup: PropertyGroup | PropertyGroup[]
    ItemGroup: ItemGroup | ItemGroup[]
  }
}

type Package = {
  '@_id': string
  '@_version': string
}

export type packageConfig = {
  packages: {
    package: Package | Package[]
  }
}

const xmlParserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  format: true,
}

export function getObjectFromXml<T>(xml: string, isFilePath = true): T {
  if (isFilePath) {
    xml = fs.readFileSync(xml, 'utf8')
  }

  const xmlParser = new XMLParser(xmlParserOptions)
  return xmlParser.parse(xml) as T
}
