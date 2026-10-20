// Each scene: SuperSplat camera coords (PlayCanvas world space). The splat mesh is
// rotated 180° about Z to match SuperSplat's viewer convention, so these camera
// values can be used directly.
export const SCENES = [
  {
    id: "trogir",
    label: "特罗吉尔老城巷道",
    title: "Get lost in the alleys of historical Trogir, Croatia",
    file: "/splats/trogir-alleys.spz",
    bytes: 22001255,
    splats: "1.44M",
    camera: { position: [14.7745, 1.5232, 42.5117], target: [16.2621, 1.3344, 43.8352], fov: 75, targetDist: 6 },
    // Walk box from the 5th–95th percentile of opaque splats (world space), eye height near the author's camera.
    walk: { min: [-48, 0.6, 12], max: [38, 4.0, 116], speed: 2.2 },
    author: "tosolini",
    authorUrl: "https://superspl.at/user/tosolini",
    source: "https://superspl.at/scene/14bac5b2",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    changes: "取原始流式 LOD 第 4 级（约 144 万 splats，原始约 2300 万），合并并转为 SPZ v3。",
  },
  {
    id: "delft",
    label: "代尔夫特东门",
    title: "Oostpoort in Delft",
    file: "/splats/delft-oostpoort.spz",
    bytes: 36542807,
    splats: "2.0M",
    camera: { position: [12.1326, 0.543, 11.0275], target: [11.2591, 0.3941, 10.4198], fov: 75, targetDist: 8 },
    // Covers the author's fly-through path (x -10.7..27, z -45..22) plus a little margin.
    walk: { min: [-14, -0.8, -46], max: [28, 5.0, 26], speed: 2.2 },
    author: "roelof",
    authorUrl: "https://superspl.at/user/roelof",
    source: "https://superspl.at/scene/3ab80765",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    changes: "取原始流式 LOD 第 2 级（约 200 万 splats，原始约 800 万），球谐降到 1 阶，转为 SPZ v3。",
  },
  {
    id: "iowa",
    label: "爱荷华州议会大厦",
    title: "Iowa Capital Building",
    file: "/splats/iowa-capitol.spz",
    bytes: 29584557,
    splats: "1.65M",
    camera: { position: [12.165, 8.2625, 3.3108], target: [0.0216, 2.6107, 0.2275], fov: 70 },
    // Aerial miniature-scale scan: "walk" is a low drone flight around the capitol.
    walk: { min: [-24, 1.2, -24], max: [24, 14, 24], speed: 3.5 },
    author: "weitzvdc",
    authorUrl: "https://superspl.at/user/weitzvdc",
    source: "https://superspl.at/scene/131f8717",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    changes: "原始 300 万 splats 均匀抽稀到约 165 万，球谐降到 1 阶，转为 SPZ v3。",
  },
];
