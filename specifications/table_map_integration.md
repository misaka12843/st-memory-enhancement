# 表格与地图插件联动逻辑规范

## 1. 目标

当表格数据（行、列、单元格内容）发生变化时，如果用户启用了地图联动功能，则自动刷新地图视图，以反映最新的数据。

## 2. 关键文件和模块

*   **`core/table/integrationManager.js` (新建)**: 负责处理所有与外部插件的联动逻辑。
*   **`core/table/cell.js`**: 表格操作的核心，包括增删行列。
*   **`core/table/base.js`**: 表格对象的基础类，包含初始化逻辑。
*   **`core/table/sheet.js`**: 表格对象的子类，包含部分修改逻辑。
*   **`scripts/runtime/mapAutoRefresh.js`**: 包含刷新地图的 `refreshLastMessage` 函数。
*   **`scripts/settings/userExtensionSetting.js`**: 管理用户设置，包括 `enableMapIntegration` 开关。

## 3. 实现方案

### 步骤 1: 创建联动管理器 (`integrationManager.js`)

创建一个新文件 `core/table/integrationManager.js`，用于集中处理联动逻辑，使其与核心表格操作解耦。

```pseudocode
// file: core/table/integrationManager.js

// 导入必要的模块
import { USER } from '../../core/manager.js';
import { refreshLastMessage } from '../../scripts/runtime/mapAutoRefresh.js';

// 假设项目已有一个 debounce 工具函数，如果没有则需要实现一个。
// import { debounce } from '../../utils/utility.js'; 

let debounceTimer;

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 */
function debounce(func, delay) {
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}


// 创建一个防抖版的地图刷新函数，延迟300毫秒执行，避免过于频繁的调用
const debouncedRefresh = debounce(refreshLastMessage, 300);

/**
 * 检查设置并触发地图更新（如果需要）。
 * 此函数将在表格数据发生任何变更后被调用。
 */
export function triggerMapUpdateIfNeeded() {
    // 检查用户是否在设置中启用了地图联动功能
    if (USER.tableBaseSetting.enableMapIntegration === true) {
        console.log('[IntegrationManager] Map integration is enabled. Triggering refresh.');
        // 调用防抖版的刷新函数
        debouncedRefresh();
    } else {
        // console.log('[IntegrationManager] Map integration is disabled. Skipping refresh.');
    }
}
```

### 步骤 2: 在数据变更点注入联动逻辑

在所有会修改表格结构 (`hashSheet`) 的地方，调用我们新创建的 `triggerMapUpdateIfNeeded` 函数。

#### 2.1 修改 `core/table/cell.js`

```pseudocode
// file: core/table/cell.js

// 在文件顶部导入新的管理器
import * as integrationManager from './integrationManager.js';

class Cell {
    // ... 其他方法 ...

    #set(value, key = 'value') {
        // ... 原有逻辑 ...
        this.data[key] = value;
        
        // 触发联动
        integrationManager.triggerMapUpdateIfNeeded();
    }

    #insertRowInParentSheet(targetRowIndex) {
        // ... 原有逻辑 ...
        this.parent.hashSheet.splice(targetRowIndex + 1, 0, newRow);
        this.parent.markPositionCacheDirty();

        // 触发联动
        integrationManager.triggerMapUpdateIfNeeded();
    }

    #insertColInParentSheet(targetColIndex) {
        // ... 原有逻辑 ...
        this.parent.hashSheet = this.parent.hashSheet.map(row => {
            // ...
            return row;
        });
        this.parent.markPositionCacheDirty();

        // 触发联动
        integrationManager.triggerMapUpdateIfNeeded();
    }

    #deleteRow(rowIndex) {
        // ... 原有逻辑 ...
        this.parent.hashSheet.splice(rowIndex, 1);
        this.parent.markPositionCacheDirty();

        // 触发联动
        integrationManager.triggerMapUpdateIfNeeded();
    }

    #deleteCol(colIndex) {
        // ... 原有逻辑 ...
        this.parent.hashSheet = this.parent.hashSheet.map(row => {
            row.splice(colIndex, 1);
            return row;
        });
        this.parent.markPositionCacheDirty();

        // 触发联动
        integrationManager.triggerMapUpdateIfNeeded();
    }
}
```

#### 2.2 修改 `core/table/base.js`

```pseudocode
// file: core/table/base.js

// 在文件顶部导入新的管理器
import * as integrationManager from './integrationManager.js';

export class SheetBase {
    // ... 其他属性和方法 ...

    init(column = 2, row = 2) {
        // ... 原有逻辑 ...
        this.hashSheet = r;

        // 触发联动
        integrationManager.triggerMapUpdateIfNeeded();
        return this;
    };

    rebuildHashSheetByValueSheet(valueSheet) {
        // ... 原有逻辑 ...
        this.hashSheet = newHashSheet;

        // 触发联动
        integrationManager.triggerMapUpdateIfNeeded();
        return this;
    }
}
```

#### 2.3 修改 `core/table/sheet.js`

```pseudocode
// file: core/table/sheet.js

// 在文件顶部导入新的管理器
import * as integrationManager from './integrationManager.js';

export class Sheet extends SheetBase {
    // ... 其他属性和方法 ...

    initHashSheet() {
        this.hashSheet = [this.hashSheet[0].map(uid => uid)];
        this.markPositionCacheDirty();

        // 触发联动
        integrationManager.triggerMapUpdateIfNeeded();
    }
}
```

## 4. 总结

通过创建一个专门的 `integrationManager` 模块，并将 `triggerMapUpdateIfNeeded()` 函数调用插入到 `cell.js`、`base.js` 和 `sheet.js` 中所有修改 `hashSheet` 的核心方法之后，我们可以确保任何对表格数据的结构性或内容性修改都能在启用联动功能时，以一种解耦且高效（通过防抖）的方式触发地图刷新。

此规范为 `code` 模式提供了清晰的实现路径。