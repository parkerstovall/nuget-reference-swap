import * as commander from "commander";
import colors from "colors";

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
    .description(
      "CLI for swapping package references between local and nuget sources to facilitate development."
    )
    .requiredOption(
      "-s, --source <source>",
      "Source to swap to (l, local or n, nuget)."
    )
    .requiredOption("-f, --file <file>", "Path to the solution file.")
    .requiredOption(
      "-n --name <name>",
      "Name of the project to swap. Use list command to find available options"
    )
    .option(
      "-v --version <version>",
      "Version of the package to swap.",
      "@Latest"
    )
    .option(
      "-p --prefix <prefix>",
      "Prefix for the project name when searching through the path"
    )
    .action(SwapCommand);

  return swap;
}

function SwapCommand(options: SwapOptions, command: commander.Command) {
  options.source = options.source.toLocaleLowerCase();
  const acceptedSources = ["l", "n", "local", "nuget"];
  if (!acceptedSources.includes(options.source)) {
    command.error(
      colors.red(
        "Invalid value for source. Supported Values: {'l', 'local', 'n', 'nuget'}"
      )
    );
  }
}
