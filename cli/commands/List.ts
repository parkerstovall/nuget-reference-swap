import * as commander from "commander";
import * as fs from "fs";
import * as path from "path";
import colors from "colors";

type ListOptions = {
  query?: string;
  verify?: string;
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
    .action(ListPackages);

  return list;
}

function getDirectories(source: string): string[] {
  return fs.readdirSync(source).filter((name) => {
    return fs.statSync(path.join(source, name)).isDirectory();
  });
}

async function ListPackages(options: ListOptions, command: commander.Command) {
  const token = process.env.token;
  const feed = process.env.feed;
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
    const paths = process.env.projectPath?.split(",") || [];
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
    if (directories.includes(row.title)) {
      console.log(colors.green(`  - Found on project path`));
    } else {
      console.log(colors.red(`  - Not found on project path`));
    }
  }
}
