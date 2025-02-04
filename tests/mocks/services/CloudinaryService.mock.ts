import { vi } from 'vitest';

export const mockCloudinaryServiceFactory = () => {
    const mockInstance = {
        cleanup: vi.fn(),
        upload: vi.fn(),
        handleMediaPasted: vi.fn(),
        settings: {},
        getInstance: vi.fn()
    };

    return {
        CloudinaryService: {
            getInstance: vi.fn().mockReturnValue(mockInstance),
            cleanup: vi.fn(),
            instance: undefined
        }
    };
}; 