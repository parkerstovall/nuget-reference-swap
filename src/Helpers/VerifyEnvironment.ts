import * as commander from 'commander'

export function VerifyEnvironment(program: commander.Command) {
  const valid = true
  if (!process.env.GIT_TOKEN) {
    program.error("Environment variable 'token' is not set.")
  }

  if (!process.env.NUGET_FEED) {
    program.error("Environment variable 'feed' is not set.")
  }

  return valid
}
