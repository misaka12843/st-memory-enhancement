# 规范：表格与地图插件直接联动功能 (修订版)

**版本**: 1.1
**日期**: 2025-07-19

## 1. 概述

本规范旨在定义一种新的、可配置的机制，以增强表格插件与地图插件之间的数据联动。此功能作为现有 `refreshLastMessage` 刷新机制的一个**高效补充选项**，允许在表格数据更新后，立即、直接地调用地图 `iframe` 内部的 `window.MapApp.update(data)` API。

其核心目标是优化用户体验，确保地图在初次显示或更新时，其内容就是最新的，避免了“先显示旧数据，再刷新”的视觉延迟。

## 2. 方案对比：新旧方案共存

- **现有方案 (`refreshLastMessage`)**:
    - **机制**: 通过刷新整个消息容器来间接触发地图更新。
    - **优点**: 实现简单，是全局刷新的一部分。
    - **缺点**: 效率较低，延迟较高，可能导致地图内容更新不及时。

- **新方案 (直接API调用)**:
    - **机制**: 在表格数据更新后，通过钩子直接调用地图 `iframe` 内部的 `update` API。
    - **优点**: 速度快，延迟低，更新精确，用户体验好。
    - **定位**: 这是一个**可选项**，用户可以在设置中启用它以获得更好的性能。它不取代旧方案，而是提供了一个并行的、更优的更新路径。

## 3. 用户配置

为了让用户能够控制此功能，将在插件的设置界面中添加一个新的选项。

- **位置**: 插件设置 -> 高级功能
- **控件**: 复选框
- **标签**: "启用与地图插件的直接数据联动" (`Enable direct data integration with map plugin`)
- **描述**: "启用后，表格更新将立即同步到地图，以获得更快的响应速度。"
- **默认状态**: 未选中 (禁用)
- **数据存储**: 此设置的状态将保存在插件的全局配置中，例如 `pluginSettings.enableMapDirectIntegration`。

## 4. 技术实现方案

### 4.1. 触发时机 (Hook)

联动的触发点应位于表格数据被完全更新之后，但在UI完全渲染给用户之前或同时。最佳的钩子位置是在 `core/tTableManager.js` 文件中的数据处理流程末端。

### 4.2. 联动逻辑

当表格数据更新时，将执行以下逻辑：

1.  **检查功能开关**:
    - 读取 `pluginSettings.enableMapDirectIntegration` 的值。
    - 如果为 `false`，则中止后续操作，流程将回退到原有的刷新机制（如 `refreshLastMessage`）。

2.  **获取最新数据**:
    - 从 `tTableManager` 或相关数据管理器中获取完整的、更新后的表格数据。

3.  **定位地图 `iframe`**:
    - 使用稳定的DOM选择器（如 `document.querySelector('iframe[data-map-plugin="true"]')`）来定位地图插件的 `iframe` 元素。

4.  **调用 `update` API**:
    - 获取 `iframe` 的 `contentWindow` 对象。
    - 检查 `contentWindow.MapApp` 和 `contentWindow.MapApp.update` 是否存在且为函数。
    - 如果API可用，则调用 `contentWindow.MapApp.update(latestTableData)`。

5.  **错误处理**:
    - 如果 `iframe` 未找到或API不存在，应在开发者控制台打印警告信息，此时流程可以优雅地降级，依赖原有的 `refreshLastMessage` 机制完成更新。

## 5. 伪代码实现

```pseudocode
// 文件: core/tTableManager.js (或类似的数据处理核心文件)

class TTableManager {
    // ... 其他方法 ...

    /**
     * 表格数据更新和渲染的主函数
     * @param {Object} newData - 新的表格数据
     */
    async function updateAndRenderTable(newData) {
        // 步骤 1: 更新内部数据模型
        this.data = processData(newData);

        // 步骤 2: 尝试使用新的直接联动方式更新地图 (如果启用)
        const directUpdateSuccess = await this.triggerMapDirectIntegration();

        // 步骤 3: 重新渲染表格UI
        this.renderTableUI();

        // 注意：此处的逻辑不阻止原有的 refreshLastMessage 流程。
        // 两个系统可以共存。如果用户追求极致性能，可以启用此开关。
        // 如果此开关关闭，则完全依赖原有的刷新流程。
    }

    /**
     * 触发与地图插件的直接数据联动
     * @returns {Promise<boolean>} - 返回一个布尔值，表示直接更新是否成功
     */
    async function triggerMapDirectIntegration() {
        // 1. 检查功能是否启用
        const settings = getPluginSettings();
        if (!settings.enableMapDirectIntegration) {
            return false; // 功能未启用，返回失败
        }

        // 2. 获取最新数据
        const latestData = this.getFormattedDataForMap();

        // 3. 定位地图 iframe
        const mapIframe = document.querySelector('iframe[data-map-plugin="true"]');

        if (!mapIframe) {
            console.warn("Map plugin iframe not found. Falling back to default refresh.");
            return false;
        }

        // 4. 调用 iframe 内部的 update API
        try {
            const mapWindow = mapIframe.contentWindow;
            if (mapWindow && mapWindow.MapApp && typeof mapWindow.MapApp.update === 'function') {
                await mapWindow.MapApp.update(latestData); // 假设 update 是异步的
                console.log("Map data updated successfully via direct API call.");
                return true; // 直接更新成功
            } else {
                console.warn("MapApp.update function not found. Falling back to default refresh.");
                return false;
            }
        } catch (error) {
            console.error("Error calling MapApp.update:", error);
            return false;
        }
    }

    /**
     * 格式化表格数据以供地图使用
     * @returns {Array}
     */
    function getFormattedDataForMap() {
        // ... 实现数据转换逻辑 ...
        return this.data.rows.map(row => ({
            id: row.id,
            lat: row.latitude,
            lng: row.longitude,
            title: row.name,
            details: row.description
        }));
    }
}

// 文件: data/pluginSetting.js

const defaultSettings = {
    // ... 其他设置 ...
    enableMapDirectIntegration: false // 新增设置的默认值
};

// 文件: assets/templates/setting.html

<div class="setting-item">
    <label for="enableMapDirectIntegration">
        <input type="checkbox" id="enableMapDirectIntegration" data-setting-key="enableMapDirectIntegration">
        启用与地图插件的直接数据联动
    </label>
    <p class="setting-description">启用后，表格更新将立即同步到地图，以获得更快的响应速度。</p>
</div>