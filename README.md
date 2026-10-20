# spark-city-demo

Vite + three.js + [Spark](https://github.com/sparkjsdev/spark) (MIT) 3D Gaussian Splatting 城市场景展示页。

`npm i && npm run dev` / `npm run build`

## 场景数据（均为 CC BY 4.0，已修改）

| 文件 | 原始场景 | 作者 | 许可 | 修改 |
|---|---|---|---|---|
| public/splats/trogir-alleys.spz (21.0 MB, 1.44M splats) | [Get lost in the alleys of historical Trogir, Croatia](https://superspl.at/scene/14bac5b2) | tosolini | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 取流式 LOD 第 4 级，转 SPZ v3 |
| public/splats/delft-oostpoort.spz (34.8 MB, 2.0M splats) | [Oostpoort in Delft](https://superspl.at/scene/3ab80765) | roelof | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 取流式 LOD 第 2 级，SH 降到 1 阶，转 SPZ v3 |
| public/splats/iowa-capitol.spz (28.2 MB, 1.65M splats) | [Iowa Capital Building](https://superspl.at/scene/131f8717) | weitzvdc | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 3M→1.65M 均匀抽稀，SH 降到 1 阶，转 SPZ v3 |

转换工具：npm `@playcanvas/splat-transform@3.9.0`（MIT），输入为 SuperSplat 公开 CDN 上的 SOG / LOD 数据。
