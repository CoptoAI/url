import { execSync } from 'node:child_process'
import process from 'node:process'

function run(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  }
  catch (error) {
    if (error.stdout)
      console.log(error.stdout.toString())
    if (error.stderr)
      console.error(error.stderr.toString())
    throw error
  }
}

console.log('🔄 Checking for upstream updates from ccbikai/sink:master...\n')

// Ensure upstream remote exists
const remotes = run('git remote').split('\n')
if (!remotes.includes('upstream')) {
  console.log('Adding upstream remote (https://github.com/ccbikai/sink.git)...')
  run('git remote add upstream https://github.com/ccbikai/sink.git')
}

// Fetch upstream
console.log('Fetching upstream commits and tags...')
run('git fetch upstream master --tags')

// Compare current master against upstream/master
const commitCount = run('git rev-list --count master..upstream/master')

if (Number.parseInt(commitCount, 10) === 0) {
  console.log('✅ Your repository is fully up to date with upstream/master!')
  process.exit(0)
}

console.log(`\n🚀 Found ${commitCount} new commit(s) in upstream/master:`)
const log = run('git log master..upstream/master --pretty=format:"  • %h - %s (%an, %ar)"')
console.log(log)

console.log('\n💡 To merge upstream changes into a sync branch:')
console.log('   1. git checkout -b sync/upstream-update master')
console.log('   2. git merge upstream/master')
console.log('   3. Resolve any conflicts, run `pnpm test`, and open a PR into master.\n')
