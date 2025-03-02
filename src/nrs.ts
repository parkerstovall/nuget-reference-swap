#! /usr/bin/env node

import 'dotenv/config'
import * as commander from 'commander'
import { Swap } from './commands/Swap'
import { List } from './commands/List'
import { VerifyEnvironment } from './Helpers/VerifyEnvironment'

const program = new commander.Command()

if (!VerifyEnvironment(program)) {
  process.exit(1)
}

program.addCommand(Swap())
program.addCommand(List())
program.parse(process.argv)
