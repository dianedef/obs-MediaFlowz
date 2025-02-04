import { vi } from 'vitest';

export const mockCommandServiceFactory = () => {
    const mockInstance = {
        registerCommand: vi.fn(),
        unregisterCommand: vi.fn(),
        clearCommands: vi.fn(),
        getInstance: vi.fn()
    };

    return {
        CommandService: {
            getInstance: vi.fn().mockReturnValue(mockInstance),
            instance: undefined
        }
    };
}; 