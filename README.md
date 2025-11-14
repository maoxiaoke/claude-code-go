# claude-go (cg)

现代化 Node.js 命令行工具脚手架（TypeScript + Commander + tsup + Vitest）。本仓库仅准备好实现前的所有物料，业务功能稍后再加。

## 安装

全局安装（建议 Node.js >= 20）：

```bash
npm i -g
```

或在本地仓库开发：

```bash
npm i
npm run dev -- --help
```

## 使用

安装后可使用以下命令：

- `claude-go --help`
- `cg --help`

当前仅展示基础帮助信息与版本号，功能尚未实现。

## 开发

```bash
# 安装依赖并初始化 Husky 钩子
npm i

# 本地调试（不打包）
npm run dev -- --help

# 代码检查 & 格式化
npm run lint
npm run format

# 单元测试
npm test

# 构建（打包到 dist/）
npm run build
```

## 发布与版本

本项目已预置 Changesets：

```bash
# 创建变更集
npm run release

# 根据变更集生成版本并写入 package.json
npm run release:version
```

## 目录结构

```
.
├── src/
│   ├── cli.ts       # CLI 入口（包含 shebang）
│   └── index.ts     # 导出核心 run()（待后续实现）
├── test/
│   └── cli.test.ts  # 示例测试
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── eslint.config.mjs
├── .prettierrc.json
├── .editorconfig
├── .gitignore
└── README.md
```

## 许可证

MIT

