/**
 * Recria as junctions necessárias para o dev server no Windows.
 *
 * O .next é redirecionado para fora do OneDrive para evitar sync excessivo.
 * O Turbopack resolve módulos a partir do diretório real do runtime (Temp),
 * então precisamos de uma junction node_modules lá para que `require('tailwindcss')`
 * funcione durante a compilação do postcss.
 *
 * Executado automaticamente via `predev` antes de `npm run dev`.
 */

const { execSync } = require('child_process')
const fs           = require('fs')
const path         = require('path')

const PROJECT_ROOT  = path.resolve(__dirname, '..')
const TEMP_NEXT     = 'C:\\Users\\onard\\AppData\\Local\\Temp\\bovcontrol-next'
const PROJECT_NEXT  = path.join(PROJECT_ROOT, '.next')
const TEMP_NM       = path.join(TEMP_NEXT, 'node_modules')
const PROJECT_NM    = path.join(PROJECT_ROOT, 'node_modules')

function isJunction(p) {
  try {
    const stat = fs.lstatSync(p)
    return stat.isSymbolicLink()
  } catch { return false }
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function mkJunction(link, target) {
  if (isJunction(link)) return // já existe
  if (fs.existsSync(link)) {
    // diretório real (não junction) — remove
    fs.rmSync(link, { recursive: true, force: true })
  }
  execSync(`cmd /c mklink /J "${link}" "${target}"`, { stdio: 'ignore' })
  console.log(`  junction: ${link} -> ${target}`)
}

// 1. Garante que o diretório Temp existe
ensureDir(TEMP_NEXT)

// 2. Junction .next -> Temp (se ainda não existir)
mkJunction(PROJECT_NEXT, TEMP_NEXT)

// 3. Junction Temp/node_modules -> project/node_modules
//    Permite que o Turbopack runtime resolva módulos a partir do Temp dir
mkJunction(TEMP_NM, PROJECT_NM)

console.log('Dev junctions OK')
