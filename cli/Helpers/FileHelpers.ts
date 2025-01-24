import * as fs from "fs";
import path from "path";

export function tryFindCsProjFile(
  projectPath: string,
  directory: string,
  projectName: string
) {
  // Try to find the csproj file in the root of the project
  let csprojFile = path.join(projectPath, directory, projectName + ".csproj");
  if (fs.existsSync(csprojFile)) {
    return csprojFile;
  }

  // Try to find the csproj file in the project directory
  csprojFile = path.join(
    projectPath,
    directory,
    projectName,
    projectName + ".csproj"
  );

  if (fs.existsSync(csprojFile)) {
    return csprojFile;
  }

  return null;
}

export function tryFindDllFile(
  projectPath: string,
  projectName: string,
  directory: string,
  targetFramework: string
) {
  let dllPath = path.join(
    projectPath,
    directory,
    "bin",
    "Debug",
    targetFramework,
    projectName + ".dll"
  );

  if (fs.existsSync(dllPath)) {
    return dllPath;
  }

  let releaseDllPath = dllPath.replace("Debug", "Release");
  if (fs.existsSync(releaseDllPath)) {
    return releaseDllPath;
  }

  dllPath = path.join(
    projectPath,
    directory,
    projectName,
    "bin",
    "Debug",
    targetFramework,
    projectName + ".dll"
  );

  if (fs.existsSync(dllPath)) {
    return dllPath;
  }

  releaseDllPath = dllPath.replace("Debug", "Release");
  if (fs.existsSync(releaseDllPath)) {
    return releaseDllPath;
  }

  return null;
}

export function tryFindSlnFile(projectPath: string) {
  const files = fs.readdirSync(projectPath);
  const slnFiles = files.filter((file) => file.endsWith(".sln"));

  if (slnFiles.length === 0) {
    return null;
  }

  return path.join(projectPath, slnFiles[0]);
}

export function getDirectories(source: string): string[] {
  return fs.readdirSync(source).filter((name) => {
    return fs.statSync(path.join(source, name)).isDirectory();
  });
}

export function tryFindTargetFramework(csprojPath: string) {
  const source = fs.readFileSync(csprojPath, "utf8");
  const targetFrameworkMatch = source.match(
    /<TargetFramework>(.*?)<\/TargetFramework>/
  );

  if (!targetFrameworkMatch) {
    return null;
  }
  return targetFrameworkMatch[1];
}
