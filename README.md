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
- 直接启动并透传参数到目标命令（默认交互选择 `claude` 或 `k2`）：
  - `cg -m sonnet --temperature 0.2`
  - `cg -- -m sonnet --temperature 0.2`（等价写法）
- 编辑配置：
  - `cg edit claude`（编辑 `~/.claude/settings.claude.json`）
  - `cg edit k2`（编辑 `~/.claude/settings.k2.json`）
  - `cg edit --common`（编辑公共配置 `~/.claude/settings.json`）

说明：

- CLI 会在运行前将 `settings.{target}.json` 深合并到 `settings.json` 并注入 `env`（如存在）到子进程环境变量。
- 未知参数将“全量透传”给子进程（不需要 `--`，但使用 `--` 也可）。

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
