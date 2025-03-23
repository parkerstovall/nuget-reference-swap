import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  csProjectXml,
  getObjectFromXml,
  packageConfig,
} from '../app-code/xml-helper'

const netFrameworkPackagesXml = `<?xml version="1.0" encoding="utf-8"?>
<packages>
  <package id="Antlr" version="3.5.0.2" targetFramework="net48" />
  <package id="bootstrap" version="3.3.7" targetFramework="net48" />
  <package id="EntityFramework" version="6.4.4" targetFramework="net48" />
  <package id="jQuery" version="3.3.1" targetFramework="net48" />
</packages>`

const netFrameworkCsProjXml = `<Project xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFrameworkVersion>v4.8</TargetFrameworkVersion>
    <RootNamespace>MyApp</RootNamespace>
    <AssemblyName>MyApp</AssemblyName>
  </PropertyGroup>

  <ItemGroup>
    <Reference Include="System" />
    <Reference Include="System.Core" />
    <Reference Include="System.Data" />
    <Reference Include="System.Xml" />
    <Reference Include="System.Xml.Linq" />
  </ItemGroup>

  <ItemGroup>
    <Compile Include="Program.cs" />
    <Compile Include="Form1.cs" />
  </ItemGroup>

  <ItemGroup>
    <Content Include="App.config" />
  </ItemGroup>

  <!-- Add the NuGet package reference here -->
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
  </ItemGroup>

  <Import Project="$(MSBuildToolsPath)\\Microsoft.CSharp.targets" />
</Project>
`

const netCoreCsProjXml = `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="DbLocator" Version="1.1.24" />
    <PackageReference Include="Microsoft.Extensions.Caching.Memory" Version="9.0.3" />
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.8" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="7.2.0" />
    <PackageReference Include="System.Data.SqlClient" Version="4.8.6" />
    <PackageReference Include="Dapper" Version="2.1.35" />
    <PackageReference Include="Unchase.Swashbuckle.AspNetCore.Extensions" Version="2.7.2" />
  </ItemGroup>

  <Target Name="PostBuild" AfterTargets="PostBuildEvent">
    <Exec Command="dotnet tool restore" /> 
    <Exec Command="dotnet swagger tofile --output ./wwwroot/swagger.json $(OutputPath)$(AssemblyName).dll v1" />
  </Target>
</Project>`

test('Check package config', { concurrency: true }, async () => {
  const parsedContent = getObjectFromXml<packageConfig>(
    netFrameworkPackagesXml,
    false,
  )

  assert.equal(Array.isArray(parsedContent.packages.package), true)
  if (Array.isArray(parsedContent.packages.package)) {
    assert.equal(parsedContent.packages.package.length, 4)
    for (const pkg of parsedContent.packages.package) {
      assert.equal(typeof pkg['@_id'], 'string')
      assert.equal(typeof pkg['@_version'], 'string')
    }

    assert.equal(parsedContent.packages.package[0]['@_id'], 'Antlr')
  }
})

test('Check csproj for net framework', { concurrency: true }, async () => {
  const parsedContent = getObjectFromXml<csProjectXml>(
    netFrameworkCsProjXml,
    false,
  )

  if (!Array.isArray(parsedContent.Project.PropertyGroup)) {
    parsedContent.Project.PropertyGroup = [parsedContent.Project.PropertyGroup]
  }
  assert.equal(
    parsedContent.Project.PropertyGroup[0].TargetFrameworkVersion,
    'v4.8',
  )
})

test('Check csproj for net core', { concurrency: true }, async () => {
  const parsedContent = getObjectFromXml<csProjectXml>(netCoreCsProjXml, false)

  if (!Array.isArray(parsedContent.Project.PropertyGroup)) {
    parsedContent.Project.PropertyGroup = [parsedContent.Project.PropertyGroup]
  }
  assert.equal(parsedContent.Project.PropertyGroup[0].TargetFramework, 'net9.0')
})
