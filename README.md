# Package Reference Manager

This is a node src to help facilitate changing references between
a local bin folder and a nuget feed.

## Installation

Set up the .env file following .env.example

Run the following in terminal:
npm i
npm run build
npm i -g .

You should then have 'prm' available as an npx command

## Commands

### List

#### Description

Lists all projects found on the NUGET_FEED, as well as if a suitable bin folder was found on the LOCAL_PACKAGE_PATH.

#### Arguments

-q, --query: Keyword to search through nuget feed
-p, --prefix: Prefix to add to the directory name when searching through the bin path. (Ex, if your organization uses a naming prefix for your repositories that your C# Projects do not have as part of their name)

### Swap

#### Description

Swaps references throughout all projects specified in a .SLN file to either a local bin folder or a nuget package from the specified feed.

#### Arguments

-s, --source: (Required) Source to swap to <l, local> or <n, nuget>

-f, --file: (Required) Path to the .SLN file (Relative to project path)

-n, --name: (Required) Name of the package to swap.

-v, --version: Version of the package to use from the feed. Defaults to latest

-p, --prefix: Prefix to add to the directory name when searching through the bin path. (See List command arguments)
