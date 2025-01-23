import * as commander from "commander";
import * as fs from "fs";
import * as path from "path";
import colors from "colors";

type ListOptions = {
  query?: string;
  verify?: string;
  prefix?: string;
};

export function List() {
  const list = new commander.Command("list");
  list
    .description("List all packages available to swap between local and nuget")
    .option("-q --query <query>", "Query to filter packages")
    .option(
      "-v --verify <verify>",
      "Check for availability at the projectPath specified in .env (true or false)",
      "true"
    )
    .option("-p --prefix <prefix>", "Prefix to add to the project name")
    .action(ListPackages);

  return list;
}

function getDirectories(source: string): string[] {
  return fs.readdirSync(source).filter((name) => {
    return fs.statSync(path.join(source, name)).isDirectory();
  });
}

function tryFindCsProjFile(
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

function tryFindDllFile(
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

function lookForDllInDirectory(projectName: string, prefix?: string) {
  const directory = (prefix || "") + projectName;
  const projectPaths = process.env.LOCAL_PACKAGE_PATH?.split(",") || [];
  let found = false;
  for (const projectPath of projectPaths) {
    const csprojFile = tryFindCsProjFile(projectPath, directory, projectName);
    if (!csprojFile) {
      continue;
    }

    const source = fs.readFileSync(csprojFile, "utf8");
    const targetFrameworkMatch = source.match(
      /<TargetFramework>(.*?)<\/TargetFramework>/
    );

    if (!targetFrameworkMatch) {
      console.log(colors.red(`  - No target framework found in ${csprojFile}`));
      continue;
    }
    const targetFramework = targetFrameworkMatch[1];

    const dllPath = tryFindDllFile(
      projectPath,
      projectName,
      directory,
      targetFramework
    );

    if (dllPath) {
      console.log(colors.green(`  - Found dll at ${dllPath}`));
      found = true;
      break;
    }
  }

  if (!found && prefix) {
    lookForDllInDirectory(projectName);
  } else if (!found) {
    console.log(colors.red(`  - No dll found on project path`));
  }
}

async function ListPackages(options: ListOptions, command: commander.Command) {
  const token = process.env.GIT_TOKEN;
  const feed = process.env.NUGET_FEED;
  let url = `${feed}/query/`;

  const query = options.query;
  if (query) {
    url += `?q=${query}`;
  }

  const data = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((response) => response.json());

  if (!data.data || data.data.length === 0) {
    console.log("No packages found.");
    return;
  }

  let directories: string[] = [];
  if (options.verify === "true") {
    const paths = process.env.LOCAL_PACKAGE_PATH?.split(",") || [];
    if (paths.length === 0) {
      command.error(colors.red("projectPath is not set in .env file"));
    }

    // Get List of directories at path
    for (const path of paths) {
      directories = [...getDirectories(path), ...directories];
    }
  }

  console.log(colors.green("Available packages:"));
  for (const row of data.data) {
    console.log(row.title);
    const directory = directories.find((d) => d === row.title);
    if (directory) {
      console.log(colors.green(`  - Found on project path`));
    } else {
      let found = false;
      const prefix = options.prefix;
      if (prefix) {
        const dirsWithPrefix = directories.map((dir) =>
          dir.replace(prefix, "")
        );
        const directoryWithPrefix = dirsWithPrefix.find((d) => d === row.title);
        if (directoryWithPrefix) {
          console.log(
            colors.green(`  - Found on project path after replacement`)
          );
          found = true;
        }
      }

      if (!found) {
        console.log(colors.red(`  - Not found on project path`));
      }
    }

    if (options.verify === "true") {
      lookForDllInDirectory(row.title, options.prefix);
    }
  }
}
