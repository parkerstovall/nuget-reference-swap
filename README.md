# Package Reference Manager

This is a node src to help facilitate changing references between
a local bin folder and a nuget feed.

## Installation

Set up the .env file following .env.example

Run the following in terminal:
npm i
npm run build
npm i -g .

You should then have 'nrs' available as an npx command

## Commands

### List

#### Description

Lists all projects found on the nuget_feed, as well as if a suitable bin folder was found on the search_path.

#### Arguments

-q, --query: Keyword to search through nuget feed

### Swap

#### Description

Swaps references throughout all projects specified in a .SLN file to either a local bin folder or a nuget package from the specified feed.

#### Arguments

-s, --source: (Required) Source to swap to <l, local> or <n, nuget>

-f, --file: (Required) Path to the .SLN file (Relative to project path)

-n, --name: (Required) Name of the package to swap.

-v, --version: Version of the package to use from the feed. Defaults to latest


### Config

#### Description

Sets configuration for the tool. Any value can technically be set, but the tool only looks for the following values:

- nuget_feed
  - The url of the nuget feed to search through
- token
  - The token (if required) to access the nuget feed
- search_path
  - Local path to search for projects