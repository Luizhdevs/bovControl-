/**
 * Setup de dev no Windows.
 *
 * Problemas que resolve:
 * 1. .next → Temp (evita sync excessivo do build pelo OneDrive)
 * 2. Temp/.next/node_modules → PROJECT/node_modules (Turbopack worker acha tailwindcss)
 *
 * node_modules fica no projeto (OneDrive) mas pinado via preinstall/postinstall.
 */

const { execSync } = require('child_process')
const fs           = require('fs')
const path         = require('path')

const PROJECT_ROOT  = path.resolve(__dirname, '..')
const TEMP_NEXT     = 'C:\\Users\\onard\\AppData\\Local\\Temp\\bovcontrol-next'
const PROJECT_NEXT  = path.join(PROJECT_ROOT, '.next')
const PROJECT_NM    = path.join(PROJECT_ROOT, 'node_modules')
const TURBOPACK_NM  = path.join(TEMP_NEXT, 'node_modules')

function isJunctionTo(link, target) {
  try {
    if (!fs.lstatSync(link).isSymbolicLink()) return false
    const direct = fs.readlinkSync(link)
    return direct.toLowerCase() === path.resolve(target).toLowerCase()
  } catch { return false }
}

function isReparsePoint(p) {
  try { return fs.lstatSync(p).isSymbolicLink() }
  catch { return false }
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function mkJunction(link, target) {
  if (isJunctionTo(link, target)) return

  if (isReparsePoint(link)) {
    execSync(`cmd /c rmdir "${link}"`, { stdio: 'ignore' })
  } else if (fs.existsSync(link)) {
    fs.rmSync(link, { recursive: true, force: true })
  }

  execSync(`cmd /c mklink /J "${link}" "${target}"`, { stdio: 'ignore' })
  console.log(`  junction: ${link} -> ${target}`)
}

// 1. .next → Temp/bovcontrol-next
ensureDir(TEMP_NEXT)
mkJunction(PROJECT_NEXT, TEMP_NEXT)

// 2. Temp/.next/node_modules → PROJECT/node_modules
//    O worker do Turbopack resolve módulos (tailwindcss etc) a partir do __dirname
//    que cai em TEMP. Sem esse junction, o worker não acha os pacotes.
if (fs.existsSync(PROJECT_NM) && !fs.lstatSync(PROJECT_NM).isSymbolicLink()) {
  mkJunction(TURBOPACK_NM, PROJECT_NM)
}

console.log('Dev junctions OK')
