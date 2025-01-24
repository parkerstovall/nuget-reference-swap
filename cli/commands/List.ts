import * as commander from "commander";
import colors from "colors";
import {
  getDirectories,
  tryFindCsProjFile,
  tryFindDllFile,
  tryFindTargetFramework,
} from "../Helpers/FileHelpers.js";

type ListOptions = {
  query?: string;
  prefix?: string;
};

export function List() {
  const list = new commander.Command("list");
  list
    .description("List all packages available to swap between local and nuget")
    .option("-q --query <query>", "Keyword to search through nuget feed")
    .option("-p --prefix <prefix>", "Prefix to add to the project name")
    .action(ListPackages);

  return list;
}

function verifyProjectDirectory(projectName: string, prefix?: string) {
  const directory = (prefix || "") + projectName;
  const projectPaths = process.env.LOCAL_PACKAGE_PATH?.split(",") || [];
  let found = false;
  for (const projectPath of projectPaths) {
    const csprojFile = tryFindCsProjFile(projectPath, directory, projectName);
    if (!csprojFile) {
      continue;
    }

    console.log(colors.green(`  - Found .csproj file at ${csprojFile}`));

    const targetFramework = tryFindTargetFramework(csprojFile);
    if (!targetFramework) {
      console.log(colors.red(`  - No target framework found in ${csprojFile}`));
      continue;
    }

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
    verifyProjectDirectory(projectName);
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
  const paths = process.env.LOCAL_PACKAGE_PATH?.split(",") || [];
  if (paths.length === 0) {
    command.error(colors.red("projectPath is not set in .env file"));
  }

  // Get List of directories at path
  for (const path of paths) {
    directories = [...getDirectories(path), ...directories];
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

    verifyProjectDirectory(row.title, options.prefix);
  }
}
