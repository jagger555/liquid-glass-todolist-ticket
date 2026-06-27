const { execFileSync } = require('node:child_process')
const { readdirSync, statSync } = require('node:fs')
const { join } = require('node:path')

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return
  }

  const apps = findApps(context.appOutDir)
  if (apps.length === 0) {
    throw new Error(`No macOS .app bundle found in ${context.appOutDir}`)
  }

  for (const appPath of apps) {
    console.log(`Ad-hoc signing macOS app: ${appPath}`)
    execFileSync(
      '/usr/bin/codesign',
      ['--force', '--deep', '--sign', '-', '--timestamp=none', appPath],
      { stdio: 'inherit' }
    )

    execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath], {
      stdio: 'inherit'
    })
  }
}

function findApps(dir) {
  const directApps = readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((path) => path.endsWith('.app') && statSync(path).isDirectory())

  if (directApps.length > 0) {
    return directApps
  }

  return findAppsRecursive(dir)
}

function findAppsRecursive(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory() && fullPath.endsWith('.app')) {
      results.push(fullPath)
    } else if (stat.isDirectory()) {
      results.push(...findAppsRecursive(fullPath))
    }
  }
  return results
}
