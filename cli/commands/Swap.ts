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

  console.log("Swapping...");
}
