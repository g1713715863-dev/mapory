// heic-convert is a pure-WASM HEIC decoder — works on Vercel unlike sharp's libheif bindings
// eslint-disable-next-line @typescript-eslint/no-require-imports
const heicConvert = require('heic-convert') as (opts: {
  buffer: Uint8Array
  format: 'JPEG' | 'PNG'
  quality?: number
}) => Promise<ArrayBuffer>

export async function heicToJpeg(input: Buffer, quality = 0.9): Promise<Buffer> {
  const result = await heicConvert({ buffer: new Uint8Array(input), format: 'JPEG', quality })
  return Buffer.from(result)
}
