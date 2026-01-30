import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const defaultTargets = [
  'dist-chrome/manifest.json',
  'dist-firefox/manifest.json',
]

const targets = process.argv.slice(2)
const manifestPaths = targets.length > 0 ? targets : defaultTargets

const LOCAL_PATTERNS = ['localhost', '127.0.0.1']

const isLocalMatch = (value) =>
  typeof value === 'string' && LOCAL_PATTERNS.some((pattern) => value.includes(pattern))

const stripLocalhost = (manifest) => {
  let changed = false

  if (Array.isArray(manifest.host_permissions)) {
    const filtered = manifest.host_permissions.filter((entry) => !isLocalMatch(entry))
    if (filtered.length !== manifest.host_permissions.length) {
      manifest.host_permissions = filtered
      changed = true
    }
  }

  if (Array.isArray(manifest.content_scripts)) {
    const filteredScripts = []
    let scriptsChanged = false

    for (const script of manifest.content_scripts) {
      if (!Array.isArray(script.matches)) {
        filteredScripts.push(script)
        continue
      }

      const filteredMatches = script.matches.filter((entry) => !isLocalMatch(entry))
      if (filteredMatches.length !== script.matches.length) {
        scriptsChanged = true
      }

      if (filteredMatches.length === 0) {
        // Script would have no matches, skip it entirely
        continue
      }

      filteredScripts.push({
        ...script,
        matches: filteredMatches,
      })
    }

    if (scriptsChanged || filteredScripts.length !== manifest.content_scripts.length) {
      manifest.content_scripts = filteredScripts
      changed = true
    }
  }

  return changed
}

const run = async () => {
  let anyChanged = false

  for (const manifestPath of manifestPaths) {
    if (!existsSync(manifestPath)) {
      console.warn(`[strip-localhost] Skipping missing file: ${manifestPath}`)
      continue
    }

    const raw = await readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(raw)
    const changed = stripLocalhost(manifest)

    if (changed) {
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
      console.log(`[strip-localhost] Updated ${manifestPath}`)
      anyChanged = true
    } else {
      console.log(`[strip-localhost] No localhost entries found in ${manifestPath}`)
    }
  }

  if (!anyChanged) {
    console.log('[strip-localhost] No changes applied')
  }
}

run().catch((error) => {
  console.error('[strip-localhost] Failed:', error)
  process.exit(1)
})
