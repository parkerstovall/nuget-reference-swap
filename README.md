# Nuget Reference Swap

This is a node src to help facilitate changing references between
a local bin folder and a nuget feed.

## Installation and Usage

    npm install nuget-reference-swap  --global
    npx nrs [command] [--arguments]

## Development

Run the following in terminal:

    npm i
    npm run build
    npm run dev -- {COMMAND}

## Commands

### Config

#### Description

Sets configuration for the tool. Any value can technically be set, but the tool only looks for the following values:

- nuget_feed
  - The url of the nuget feed to search through
- token
  - The token (if required) to access the nuget feed
- search_path
  - Local path to search for projects

### List

#### Description

Lists all projects found on the nuget_feed, as well as if a suitable bin folder was found on the search_path.

#### Arguments

-q, --query: Keyword to search through nuget feed

-a, --auth: Whether to use nuget_feed and token stored in config. Defaults to public nuget feed.

### Swap

#### Description

Swaps references throughout all projects specified in a .SLN file to either a local bin folder or a nuget package from the specified feed.

#### Arguments

-s, --solution: Name of Solution to swap references in (Relative to project path)

-n, --name: (Required) Name of the package to swap.

-l, --local: If specified, swaps package from nuget source to local build. Default is the reverse.

-a, --auth: Whether to use nuget_feed and token stored in config. Defaults to public nuget feed.
