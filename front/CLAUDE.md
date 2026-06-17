@AGENTS.md
# 代码规范

## 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 后端文件名 | camelCase | `userController.js`、`authMiddleware.js` |
| 前端组件文件名 | PascalCase | `ChatWindow.jsx`、`StepCard.jsx` |
| 前端非组件文件名 | camelCase | `useSSE.js`、`request.js` |
| 变量 / 函数名 | camelCase | `userId`、`getSessionList()` |
| 类名 | PascalCase | `class AgentExecutor` |
| 常量 | UPPER_SNAKE_CASE | `MAX_STEPS`、`JWT_EXPIRES_IN` |
| 数据库表名 / 字段名 | snake_case | `user_id`、`created_at` |
| 路由路径 | kebab-case | `/api/chat-sessions` |

**前后端字段映射**：数据库是 `snake_case`，JS 里统一转成 `camelCase`。不要在业务代码里直接用 `user_id` 这种写法，查询结果出库时统一转换。

```js
// 数据库取出来是 snake_case，转换后再往外传
function toCamel(row) {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at
  }
}
```

---

## 异步处理

统一用 `async/await`，禁止 `.then().catch()` 链式写法和裸 callback。

```js
// 推荐
async function getSession(id) {
  const session = await db.query('SELECT * FROM sessions WHERE id = ?', [id])
  return session
}

// 不推荐
function getSession(id) {
  return db.query('SELECT * FROM sessions WHERE id = ?', [id]).then(session => session)
}
```

---

## 错误处理

### 后端：统一抛给 Express 错误中间件

业务代码里只管 `throw`，不在每个路由里写 `try/catch` 包一层 `res.status(500)`。

```js
// routes/sessions.js
router.get('/:id', async (req, res, next) => {
  try {
    const session = await getSession(req.params.id)
    if (!session) throw new AppError(404, '会话不存在')
    res.json({ data: session })
  } catch (err) {
    next(err) // 统一交给错误中间件
  }
})

// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  const status = err.status || 500
  res.status(status).json({ error: err.message || '服务器内部错误' })
}
```

自定义错误类统一用 `AppError`，带状态码：

```js
class AppError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
```

### 前端：统一在 axios 拦截器里处理

组件里不写 `try/catch` 判断网络错误，统一交给拦截器处理 401 续期、500 提示等通用逻辑，组件只处理业务层面的错误展示。

---

## 返回格式

**成功响应：**
```json
{ "data": { ... } }
```

**失败响应：**
```json
{ "error": "具体错误信息" }
```

不要返回裸数组或裸对象，所有响应都包一层 `data` / `error`，前端解析逻辑统一。

---

## 接口设计规范

- RESTful 风格：资源用名词，动作用 HTTP 方法表达（GET 查询 / POST 创建 / PATCH 更新 / DELETE 删除）
- 路径用复数：`/api/sessions` 不是 `/api/session`
- 需要登录的接口必须校验 `Authorization: Bearer {token}`，未带 token 返回 401
- 分页参数统一用 `?page=1&pageSize=20`
- 时间字段统一用 ISO 8601 格式（`2026-06-17T10:00:00Z`）

---

## SSE 规范

事件统一用 JSON 字符串，格式固定：

```js
res.write(`data: ${JSON.stringify({ type: 'step', data: {...} })}\n\n`)
```

三种 `type`：`step`（步骤状态更新）、`token`（流式文字）、`done`（结束）。新增事件类型要在 `CLAUDE.md` 里同步记录。

---

## 前端规范

- 所有网络请求走统一封装的 `src/api/request.js`，组件里禁止直接 `import axios` 发请求
- 组件内部状态用 `useState`，跨组件共享状态再考虑 `useReducer` 或 Context，不要一开始就上 Redux
- 样式统一用 Less Module（`*.module.less`），全局变量定义在 `src/styles/variables.less`
- 每个组件文件只导出一个默认组件，文件名与组件名一致

---

## 日志规范

- 开发环境用 `console.log` 即可，不需要引入额外日志库
- 关键节点打日志：请求进入、Agent 工具调用、数据库写入失败
- 禁止打印敏感信息（密码、token 全文）到日志

---

## 文件组织

按功能模块分目录，不按文件类型分：

```
backend/
├── routes/          # 路由层，只做参数校验 + 调用 service
├── services/        # 业务逻辑层
├── models/           # 数据库操作
├── middleware/        # 中间件
└── agent/            # Agent 相关，单独成模块
```

路由层薄，业务逻辑下沉到 service，方便单独测试。

---

## 注释规范

- 函数上方写一行注释说明用途，不需要逐行注释
- 复杂逻辑（比如 ReAct 循环判断条件）必须注释说明为什么这样写
- 不写显而易见的注释（比如 `// 设置 username` 这种）

```js
// 解析 LLM 返回内容，判断是工具调用还是最终答案
function parseAgentOutput(response) {
  ...
}
```

---

## Git 提交规范

```
feat: 新增功能
fix: 修复 bug
refactor: 重构（不影响功能）
docs: 文档修改
chore: 配置 / 依赖调整
```

例：`feat: 新增会话重命名接口`