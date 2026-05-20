const A = 6378245.0
const EE = 0.00669342162296594323

function transformLat(x: number, y: number) {
  let r = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*Math.sqrt(Math.abs(x))
  r += (20*Math.sin(6*x*Math.PI) + 20*Math.sin(2*x*Math.PI)) * 2/3
  r += (20*Math.sin(y*Math.PI) + 40*Math.sin(y/3*Math.PI)) * 2/3
  r += (160*Math.sin(y/12*Math.PI) + 320*Math.sin(y*Math.PI/30)) * 2/3
  return r
}

function transformLng(x: number, y: number) {
  let r = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*Math.sqrt(Math.abs(x))
  r += (20*Math.sin(6*x*Math.PI) + 20*Math.sin(2*x*Math.PI)) * 2/3
  r += (20*Math.sin(x*Math.PI) + 40*Math.sin(x/3*Math.PI)) * 2/3
  r += (150*Math.sin(x/12*Math.PI) + 300*Math.sin(x/30*Math.PI)) * 2/3
  return r
}

// 高德 GCJ-02 → WGS-84（Mapbox 使用的坐标系），误差约 1–5 m
export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  const dLat = transformLat(lng - 105, lat - 35)
  const dLng = transformLng(lng - 105, lat - 35)
  const rad = lat / 180 * Math.PI
  let magic = Math.sin(rad)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  return [
    lng - (dLng * 180) / (A / sqrtMagic * Math.cos(rad) * Math.PI),
    lat - (dLat * 180) / ((A * (1 - EE)) / (magic * sqrtMagic) * Math.PI),
  ]
}
