#! /usr/bin/env node

import 'dotenv/config'
import * as commander from 'commander'
import { Swap } from './commands/Swap'
import { List } from './commands/List'
import { Config } from './commands/Config'
import { Clear } from './commands/Clear'

const program = new commander.Command()
program.addCommand(Swap())
program.addCommand(List())
program.addCommand(Config())
program.addCommand(Clear())
program
  .version('1.0.5')
  .description(
    'A CLI tool to swap package references between a local solution and a nuget feed in .NET projects',
  )
program.parse(process.argv)
