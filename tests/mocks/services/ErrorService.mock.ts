import { vi } from 'vitest';

export enum ErrorType {
    CONFIG = 'CONFIG',
    UPLOAD = 'UPLOAD',
    NETWORK = 'NETWORK',
    VALIDATION = 'VALIDATION',
    UNKNOWN = 'UNKNOWN'
}

export interface IError {
    type: ErrorType;
    message: string;
    details?: any;
}

export const createError = (type: ErrorType, message: string, details?: any): IError => ({
    type,
    message,
    details
});

export const mockErrorServiceFactory = () => {
    const mockInstance = {
        handleError: vi.fn(),
        isNetworkError: vi.fn().mockImplementation((error: any) => {
            return error?.type === ErrorType.NETWORK;
        }),
        createError: vi.fn().mockImplementation(createError)
    };

    return {
        ErrorService: {
            getInstance: vi.fn().mockReturnValue(mockInstance),
            instance: mockInstance
        },
        ErrorType
    };
}; 