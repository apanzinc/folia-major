# MiSans（界面字体）

Folia 的默认界面字体是 MiSans 可变字体。这个目录只保留一份浏览器实际会用到的 woff2：

- `MiSansVF.woff2` — MiSans 可变字体（`wght` 轴 150–700，完整字表），由官方 `MiSansVF.ttf`
  用 fontTools 以 `flavor="woff2"` 转换而来。
- `src/index.css` 里以 `@font-face` 声明它（`font-family: 'MiSans UI'`），
  `src/services/uiFont.ts` 在运行时按设置把它写进 `--font-ui`。

字体版权归小米（Xiaomi）所有，使用条款见 MiSans 官方页面：<https://hyperos.mi.com/font/>。
本仓库只做格式转换与打包，不改动字形。
