#! /usr/bin/env node

import 'dotenv/config'
import * as commander from 'commander'
import { Swap } from './commands/Swap'
import { List } from './commands/List'
import { Config } from './commands/Config'

const program = new commander.Command()
program.addCommand(Swap())
program.addCommand(List())
program.addCommand(Config())
program.parse(process.argv)
