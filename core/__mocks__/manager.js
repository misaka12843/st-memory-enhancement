// Manual mock for core/manager.js
export const USER = {
    tableBaseSetting: {},
};

export const DERIVED = {
    any: {},
};

export const EDITOR = {
    success: jest.fn(),
    error: jest.fn(),
};

export const BASE = {};

export const SYSTEM = {
    lazy: () => true,
};