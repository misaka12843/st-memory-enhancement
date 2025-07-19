// Import the function to test
import { handleMapDirectIntegration } from '../../scripts/runtime/absoluteRefresh.js';
// Import the mocked dependencies to control their behavior
import { USER, DERIVED, EDITOR } from '../../core/manager.js';

// Mock all other dependencies of absoluteRefresh.js
jest.mock('../../index.js', () => ({}));
jest.mock('../../core/table/oldTableActions.js', () => ({}));
jest.mock('../../scripts/renderer/tablePushToChat.js', () => ({}));
jest.mock('../../scripts/runtime/separateTableUpdate.js', () => ({}));
jest.mock('../../scripts/settings/standaloneAPI.js', () => ({}));
jest.mock('../../data/profile_prompts.js', () => ({}));
jest.mock('../../scripts/editor/chatSheetsDataView.js', () => ({}));
jest.mock('../../components/formManager.js', () => ({}));
jest.mock('../../scripts/settings/userExtensionSetting.js', () => ({}));


describe('handleMapDirectIntegration', () => {

    // Create a global mock for toastr before all tests
    beforeAll(() => {
        global.toastr = {
            success: jest.fn(),
            error: jest.fn(),
            warning: jest.fn(),
            info: jest.fn(),
        };
    });

    beforeEach(() => {
        // Reset mocks before each test. 
        jest.clearAllMocks();

        // Set default states on the imported mock objects by modifying their properties
        USER.tableBaseSetting.enableMapIntegration = false;
        DERIVED.any.waitingTable = [{ name: 'default test table' }];
    });

    test('should do nothing if map integration is disabled', () => {
        // Arrange
        USER.tableBaseSetting.enableMapIntegration = false;
        const querySelectorSpy = jest.spyOn(document, 'querySelector');
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Act
        handleMapDirectIntegration();

        // Assert
        expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Map direct integration is enabled'));
        expect(querySelectorSpy).not.toHaveBeenCalled();

        // Cleanup spies
        querySelectorSpy.mockRestore();
        consoleLogSpy.mockRestore();
    });

    test('should warn and exit if integration is enabled but iframe is not found', () => {
        // Arrange
        USER.tableBaseSetting.enableMapIntegration = true;
        const querySelectorSpy = jest.spyOn(document, 'querySelector').mockReturnValue(null);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        // Act
        handleMapDirectIntegration();

        // Assert
        expect(querySelectorSpy).toHaveBeenCalledWith('iframe[data-plugin-id="map"]');
        expect(consoleWarnSpy).toHaveBeenCalledWith('[Memory Enhancement] Map plugin iframe not found. Skipping direct update.');
        expect(EDITOR.success).not.toHaveBeenCalled();

        // Cleanup spies
        querySelectorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    test('should warn and exit if iframe is found but MapApp.update API is not available', () => {
        // Arrange
        USER.tableBaseSetting.enableMapIntegration = true;
        const mockIframe = { contentWindow: { MapApp: {} } };
        const querySelectorSpy = jest.spyOn(document, 'querySelector').mockReturnValue(mockIframe);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        // Act
        handleMapDirectIntegration();

        // Assert
        expect(querySelectorSpy).toHaveBeenCalledWith('iframe[data-plugin-id="map"]');
        expect(consoleWarnSpy).toHaveBeenCalledWith('[Memory Enhancement] Map plugin API (window.MapApp.update) not found or not a function.');
        expect(EDITOR.success).not.toHaveBeenCalled();
        
        // Cleanup spies
        querySelectorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    test('should call MapApp.update with table data when integration is fully enabled', () => {
        // Arrange
        USER.tableBaseSetting.enableMapIntegration = true;
        const mockUpdate = jest.fn();
        const mockIframe = { contentWindow: { MapApp: { update: mockUpdate } } };
        const querySelectorSpy = jest.spyOn(document, 'querySelector').mockReturnValue(mockIframe);
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const mockTableData = [{ id: 1, name: 'Test Location' }];
        DERIVED.any.waitingTable = mockTableData;

        // Act
        handleMapDirectIntegration();

        // Assert
        expect(querySelectorSpy).toHaveBeenCalledWith('iframe[data-plugin-id="map"]');
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith(mockTableData);
        expect(consoleLogSpy).toHaveBeenCalledWith('[Memory Enhancement] Successfully pushed data to map plugin.');
        expect(EDITOR.success).toHaveBeenCalledWith('地图数据已同步更新');

        // Cleanup spies
        querySelectorSpy.mockRestore();
        consoleLogSpy.mockRestore();
    });

    test('should handle errors gracefully during the process', () => {
        // Arrange
        USER.tableBaseSetting.enableMapIntegration = true;
        const errorMessage = 'Test error';
        const querySelectorSpy = jest.spyOn(document, 'querySelector').mockImplementation(() => {
            throw new Error(errorMessage);
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Act
        handleMapDirectIntegration();

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith('[Memory Enhancement] Error during map direct integration:', expect.any(Error));
        expect(EDITOR.error).toHaveBeenCalledWith('与地图插件联动时发生错误，请检查控制台日志。');

        // Cleanup spies
        querySelectorSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
});