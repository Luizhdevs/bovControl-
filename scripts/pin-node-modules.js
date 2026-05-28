/**
 * preinstall — garante que node_modules existe e está "pinado" no OneDrive.
 *
 * attrib +P = "Always keep on this device" — impede que o OneDrive
 * ejete os arquivos depois de sincronizá-los.
 * Em sistemas sem OneDrive, o comando falha silenciosamente.
 */

const { execSync } = require('child_process')
const fs           = require('fs')
const path         = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PROJECT_NM   = path.join(PROJECT_ROOT, 'node_modules')

if (!fs.existsSync(PROJECT_NM)) {
  fs.mkdirSync(PROJECT_NM, { recursive: true })
}

try {
  execSync(`attrib +P "${PROJECT_NM}"`, { stdio: 'ignore' })
} catch { /* não-OneDrive: ignora */ }
