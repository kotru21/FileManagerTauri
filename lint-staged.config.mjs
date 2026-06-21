export default {
  "*.{ts,tsx}": ["biome check --write --no-errors-on-unmatched", "tsc-files --noEmit"],
}
