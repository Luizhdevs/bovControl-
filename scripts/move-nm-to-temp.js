/**
 * postinstall — pina node_modules no OneDrive recursivamente.
 *
 * attrib +P /s /d = "Always keep on this device" para todos os arquivos
 * instalados, impedindo que o OneDrive ejete os pacotes após sincronizar.
 * Roda só em Windows (OneDrive). Em outros sistemas, falha silenciosamente.
 */

const { execSync } = require('child_process')
const path         = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PROJECT_NM   = path.join(PROJECT_ROOT, 'node_modules')

try {
  execSync(`attrib +P "${PROJECT_NM}" /s /d`, { stdio: 'ignore' })
  console.log('node_modules pinned (OneDrive will not evict)')
} catch { /* não-OneDrive: ignora */ }
