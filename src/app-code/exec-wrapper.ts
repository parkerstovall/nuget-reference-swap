import { execSync } from 'child_process'
import colors from 'colors'

export const execWrapper = (cmd: string) => {
  try {
    return execSync(cmd)
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'stdout' in e &&
      e.stdout &&
      e.stdout.toString
    ) {
      console.log(e.stdout.toString())
    }
    console.log(colors.red(`Failed to execute: ${cmd}`))
    process.exit(1)
  }
}
