# 规范：修复 `map.html` 中的 `window.MapApp.update` 函数覆盖问题

## 1. 目标

修改 `map.html` 文件，解决文件末尾的 `window.MapApp.update` 函数（日志记录函数）覆盖核心 `window.MapApp.update` 函数（地图渲染函数）的问题。最终目标是让外部调用 `window.MapApp.update(data)` 时，既能触发地图的重新渲染，也能在页面上打印日志。

## 2. 问题分析

在 `map.html` 中：
- **核心 `update` 函数**：定义于 `line 1372` 左右，在 `window.MapApp` 对象内部。此函数负责处理数据、更新地图状态和重新渲染整个地图界面。
- **覆盖 `update` 函数**：定义于 `line 2203` 左右，在一个单独的 `<script>` 标签中。此函数被设计为全局通信接口，用于接收数据并将其显示在日志区域 (`#log-output`)。

当前的实现导致后者完全覆盖了前者。

## 3. 实施策略

我们将采用一种非侵入性的方式来解决这个问题，即在 `window.MapApp` 初始化时，将核心 `update` 函数的引用保存起来，然后在全局的 `update` 函数中调用它。

### 3.1. 伪代码

**文件: [`map.html`](./map.html)**

```pseudocode
// 步骤 1: 在 window.MapApp 的 init() 函数中，保存原始 update 函数的引用。
//         这是为了防止它被后续的脚本覆盖。

locate function init() within window.MapApp object (around line 1353)

// 在 init() 函数的开始部分，添加以下逻辑：
// this.init() {
//   if (this.initialized) { ... }
//   this.initialized = true;
//
//   --> ADD THIS LINE:
//   this._internalUpdate = this.update; 
//
//   console.log("MapApp.init() - ...");
//   this.cacheElements();
//   ...
// }

// 步骤 2: 修改文件末尾的全局 update 函数，使其调用保存的内部函数。

locate the script block at the end of the file (around line 2196)

// 修改 window.MapApp.update 函数的实现
// from:
// window.MapApp.update = function(data) {
//     console.log('[MapApp API] 接收到来自主插件的数据:', data);
//     const logOutputEl = document.getElementById('log-output');
//     if (logOutputEl) {
//         logOutputEl.textContent = JSON.stringify(data, null, 2);
//     } else {
//         console.error('[MapApp API] 未找到ID为 "log-output" 的元素来显示数据。');
//     }
// };
//
// to:
// window.MapApp.update = function(data) {
//     // 步骤 2.1: 首先，调用内部的核心 update 函数来更新地图。
//     //          使用 `call(window.MapApp, data)` 来确保函数内部的 `this` 指向正确的对象。
//     if (window.MapApp._internalUpdate) {
//         try {
//             window.MapApp._internalUpdate.call(window.MapApp, data);
//         } catch (e) {
//             console.error('[MapApp API] 调用内部更新函数时出错:', e);
//         }
//     } else {
//         console.error('[MapApp API] 无法找到内部更新函数 (_internalUpdate)。地图可能不会更新。');
//     }
//
//     // 步骤 2.2: 然后，执行原始的日志记录逻辑。
//     console.log('[MapApp API] 接收到来自主插件的数据:', data);
//     const logOutputEl = document.getElementById('log-output');
//     if (logOutputEl) {
//         logOutputEl.textContent = JSON.stringify(data, null, 2);
//     } else {
//         console.error('[MapApp API] 未找到ID为 "log-output" 的元素来显示数据。');
//     }
// };

```

## 4. 预期结果

完成修改后，当外部代码（例如，另一个插件）调用 `window.MapApp.update(someData)` 时：
1.  地图将根据 `someData` 的内容进行更新和重新渲染。
2.  `someData` 的 JSON 表示将被打印到 ID 为 `log-output` 的 `<pre>` 元素中。
3.  两个功能将按预期协同工作，解决了函数覆盖的问题。
