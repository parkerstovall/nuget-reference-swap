import * as commander from "commander";
import * as fs from "fs";
import colors from "colors";
import { tryFindProjectListFromSlnFile } from "../Helpers/FileHelpers.js";

type SwapOptions = {
  source: string;
  file: string;
  name: string;
  version: string;
  prefix?: string;
};

export function Swap() {
  const swap = new commander.Command("swap");
  swap
    .description("Swap package references between local and nuget sources")
    .requiredOption(
      "-s, --source <source>",
      "(Required) Source to swap to <l, local> or <n, nuget>"
    )
    .requiredOption("-f, --file <file>", "(Required) Path to the solution file")
    .requiredOption(
      "-n --name <name>",
      "(Required) Name of the project to swap. Use list command to find available options"
    )
    .option(
      "-v --version <version>",
      "Version of the package to swap.",
      "@Latest"
    )
    .option(
      "-p --prefix <prefix>",
      "Prefix for the directory name when searching through the path"
    )
    .action(SwapCommand);

  return swap;
}

function getListOfProjects(slnPath: string, command: commander.Command) {
  const projectPaths = process.env.LOCAL_PACKAGE_PATH?.split(",") || [];
  let projects: { name: string; projectPath: string; fullPath: string }[] = [];
  for (const projectPath of projectPaths) {
    const tempProjects = tryFindProjectListFromSlnFile(projectPath, slnPath);
    if (!tempProjects || tempProjects.length === 0) {
      continue;
    }

    projects = tempProjects;
    break;
  }

  if (projects.length === 0) {
    command.error(colors.red("No projects found in the solution file"));
  }

  return projects;
}

function verifyOptions(options: SwapOptions, command: commander.Command) {
  const acceptedSources = ["l", "n", "local", "nuget"];
  if (!acceptedSources.includes(options.source)) {
    command.error(
      colors.red(
        "Invalid value for source. Supported Values: {'l', 'local', 'n', 'nuget'}"
      )
    );
  }
}

function SwapCommand(options: SwapOptions, command: commander.Command) {
  options.source = options.source.toLocaleLowerCase();
  verifyOptions(options, command);

  const projectList = getListOfProjects(options.file, command);
  for (const project of projectList) {
    if (!fs.existsSync(project.fullPath)) {
      command.error(colors.red(`File not found at ${project.fullPath}`));
    }

    let content = fs.readFileSync(project.fullPath, "utf8");
    const regex = new RegExp(`<PackageReference Include="${options.name}".*/>`);

    if (!content.match(regex)) {
      continue;
    }

    console.log(`Swapping package reference for Project: ${project.name}`);

    if (options.source === "l" || options.source === "local") {
      content = content.replace(regex, "");
      content = content.replace(
        "</Project>",
        `
  <ItemGroup>
    <Reference Include="${options.name}">
      <HintPath>.\\MyDLLFolder\\MyAssembly.dll</HintPath>
    </Reference>
  </ItemGroup>
</Project>
        `
      );
      //logic
    }

    fs.writeFileSync(project.fullPath, content);
  }
}
