import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const version = pkg.version

const cargoPath = join(root, "src-tauri", "Cargo.toml")
let cargo = readFileSync(cargoPath, "utf8")
cargo = cargo.replace(/^version = ".*"$/m, `version = "${version}"`)
writeFileSync(cargoPath, cargo)

const tauriConfPath = join(root, "src-tauri", "tauri.conf.json")
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf8"))
tauriConf.version = version
writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`)

console.log(`Synced version ${version} to Cargo.toml and tauri.conf.json`)
