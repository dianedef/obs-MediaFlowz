import { vi } from 'vitest';

export const ErrorType = {
    CONFIG: 'config',
    UPLOAD: 'upload',
    EDITOR: 'editor',
    NETWORK: 'network',
    UNEXPECTED: 'unexpected'
} as const;

const mockErrorService = {
    handleError: vi.fn(),
    isNetworkError: vi.fn(),
    createError: vi.fn((type: string, message: string, originalError?: Error, context?: Record<string, unknown>) => ({
        type,
        message,
        originalError,
        context
    }))
};

export class MockErrorService {
    static instance: typeof mockErrorService | undefined;
    
    static getInstance() {
        if (!MockErrorService.instance) {
            MockErrorService.instance = mockErrorService;
        }
        return MockErrorService.instance;
    }

    static cleanup() {
        MockErrorService.instance = undefined;
    }
}

export const mockErrorServiceFactory = () => ({
    ErrorService: MockErrorService,
    ErrorType
}); 