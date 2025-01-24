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

export function tryFindProjectListFromSlnFile(
  projectPath: string,
  filePath: string
) {
  let content = "";
  const slnPath = path.join(projectPath, filePath);
  if (slnPath.endsWith(".sln")) {
    if (!fs.existsSync(slnPath)) {
      return null;
    }

    content = fs.readFileSync(slnPath, "utf8");
  } else {
    const files = fs.readdirSync(slnPath);
    const slnFile = files.find((file) => file.endsWith(".sln"));
    if (!slnFile) {
      return null;
    }

    content = fs.readFileSync(path.join(slnPath, slnFile), "utf8");
  }

  const projects = content.match(/Project.* = "(.*?)", "(.*?)"/g);
  if (!projects) {
    return null;
  }

  const projectPaths = projects
    .map((project) => {
      const match = project.match(/Project.* = "(.*?)", "(.*?)"/);
      if (!match) {
        return null;
      }

      const projectPath = match[2].replace(/\\/g, "/");
      const fullPath = path.join(slnPath.replace(".sln", ""), projectPath);

      return {
        name: match[1],
        projectPath,
        fullPath,
      };
    })
    .filter((project) => project !== null);

  return projectPaths;
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
