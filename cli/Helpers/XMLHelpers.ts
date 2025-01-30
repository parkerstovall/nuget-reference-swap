import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import * as fs from 'fs'

export type PackageReference = {
  '@_Include': string
  '@_Version': string
}

export type ProjectReference = {
  '@_Include': string
}

export type ItemGroup = {
  PackageReference?: PackageReference | PackageReference[]
  ProjectReference?: ProjectReference | ProjectReference[]
}

type PropertyGroup = {
  TargetFramework: string
}

// There is a lot more to the csproject file, I just don't need it.
export type csProjectXml = {
  Project: {
    PropertyGroup: PropertyGroup
    ItemGroup: ItemGroup | ItemGroup[]
  }
}

const xmlParserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
}

export function getCsProjFromXml(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8')
  const xmlParser = new XMLParser(xmlParserOptions)
  return xmlParser.parse(content) as csProjectXml
}

export function getXmlFromJsObject(jsObj: object) {
  const builder = new XMLBuilder(xmlParserOptions)
  return builder.build(jsObj)
}
