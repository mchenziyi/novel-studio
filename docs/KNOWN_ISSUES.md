# 已知问题和 Bug

> 最后更新: 2026-06-01

## Bug #1: 章节编辑器 textarea 高度异常

**严重程度**: 高
**状态**: ✅ 已修复
**影响**: `/chapters/[id]` 页面的 textarea 编辑器无法显示

### 根因

**布局结构错误**，不是 CSS/Tailwind/Turbopack 的问题。

`AiEditSidebar`（AI 编辑侧边栏）被放在了外层 **column flex 容器**的子级，与主内容区成为兄弟元素：

```
❌ 修复前的结构：
Column container (height: 100vh):
  ├── Toolbar (flex-shrink-0)
  ├── Main content area (flex: 1, row direction)
  │    ├── Editor + textarea (flex: 1)
  │    └── Versions panel (optional)
  └── AiEditSidebar (w=400px, h-full=100vh)  ← 问题所在！
```

AiEditSidebar 的 `h-full`（= 100% of parent = 100vh）在 column 布局中抢占了全部高度，把 Main content area 的 `flex: 1` 挤到了 0 高度。

### 修复

将 AiEditSidebar 移到 Main content area 内部，作为 row 方向的兄弟：

```
✅ 修复后的结构：
Column container (height: 100vh):
  ├── Toolbar (flex-shrink-0)
  └── Main content area (flex: 1, row direction)
       ├── Editor + textarea (flex: 1)  ← 现在正确填充
       ├── Versions panel (optional)
       └── AiEditSidebar (w=400px)      ← 在行内，不影响高度
```

### 修改文件

- `app/chapters/[id]/chapter-editor.tsx`: 将 `<AiEditSidebar>` 从外层 column 子级移到 Main content area 内部

### 教训

- 之前误判为 Tailwind CSS + Turbopack 编译问题，实际上纯粹是布局结构错误
- `h-full` 在 column flex 容器中 = 100% parent height，会抢占兄弟元素空间
- 调试 CSS 布局问题时，应该先检查 DOM 结构，而不是假设是编译器问题

---

## Bug #2: Turbopack 读取 socket 文件崩溃

**严重程度**: 中
**状态**: 已修复
**影响**: Turbopack 尝试读取 `.codegraph/daemon.sock` 导致 FATAL 错误

### 现象

```
FATAL: An unexpected Turbopack error occurred.
reading file ".codegraph/daemon.sock"
Operation not supported on socket (os error 102)
```

### 根因

`.codegraph/` 目录（某个代码分析工具）包含 socket 文件，Turbopack 在扫描项目文件时尝试读取它。

### 修复

1. 删除 `.codegraph` 目录
2. 在 `.gitignore` 中添加 `.codegraph/`

---

## Bug #3: Turbopack 缓存导致 Module Not Found

**严重程度**: 中
**状态**: 已修复
**影响**: 客户端 JS 加载失败，页面空白

### 现象

- Server Component 渲染的 HTML 正确
- 浏览器端页面空白
- Console 报错: `Module not found: Can't resolve './error-boundary'`

### 根因

编辑过程中创建又删除了 `error-boundary.tsx` 文件，Turbopack 缓存了旧的模块引用。服务端和客户端使用不同的模块解析路径，服务端正常但客户端加载失败。

### 修复

```bash
rm -rf .next
# 重启 dev server
```

### 预防

- 修改文件结构后如果出现奇怪的客户端错误，先清除 `.next` 缓存
- 检查 `[browser]` 前缀的日志（在 `/tmp/next-dev.log` 中）

---

## Bug #4: diff 库 SSR 兼容性

**严重程度**: 中
**状态**: 已修复
**影响**: 服务端渲染报错

### 现象

`diff` v9.0.0 是 ESM-only（`"type": "module"`），静态 import 在 SSR 时报错。

### 修复

改为动态 import:
```typescript
const computeDiff = async (oldText: string, newText: string, mode: 'char' | 'word' | 'line') => {
  const { diffChars, diffWords, diffLines } = await import('diff');
  // ...
};
```

---

## 已解决的历史问题

| 问题 | 根因 | 修复方式 |
|------|------|----------|
| 所有章节显示"待同步" | 数据库迁移后 status 字段未更新 | SQL UPDATE |
| 伏笔页面报错 | 组件渲染异常 | 修复组件 |
| loading.tsx 阻塞渲染 | Suspense 边界问题 | 删除 loading.tsx |
| next/dynamic ssr:false 引发问题 | "Bail out to client-side rendering" | 改为普通 import |

---

## 测试盲区

当前测试套件（Jest + jsdom）无法覆盖以下场景:

1. **SSR → Client hydration**: jsdom 不执行真正的 React hydration
2. **CSS 布局**: jsdom 无布局引擎，无法检测元素是否可见
3. **Turbopack 编译**: 测试不经过 Turbopack
4. **浏览器端模块加载**: jsdom 不模拟浏览器的模块加载

**建议**: 添加 Playwright E2E 测试覆盖关键页面的浏览器端渲染。
