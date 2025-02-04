import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/api/cloudinary.handlers';
import { mockErrorServiceFactory } from './mocks/services/ErrorService.mock';
import { mockEventBusServiceFactory } from './mocks/services/EventBusService.mock';
import { mockCommandServiceFactory } from './mocks/services/CommandService.mock';

// Setup MSW
export const server = setupServer(...handlers);

// Démarrer le serveur MSW avant tous les tests
beforeAll(() => server.listen({ 
    onUnhandledRequest: 'bypass' // Permet aux requêtes non gérées de passer
}));

// Reset les handlers après chaque test
afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
});

// Fermer le serveur après tous les tests
afterAll(() => server.close());

// Mock des services
vi.mock('@/services/ErrorService', () => mockErrorServiceFactory());
vi.mock('@/services/EventBusService', () => mockEventBusServiceFactory());
vi.mock('@/services/CommandService', () => mockCommandServiceFactory());

// Mock des classes DOM
class MockDataTransfer implements DataTransfer {
    dropEffect: 'none' | 'copy' | 'link' | 'move' = 'none';
    effectAllowed: 'none' | 'copy' | 'copyLink' | 'copyMove' | 'link' | 'linkMove' | 'move' | 'all' | 'uninitialized' = 'none';
    items: DataTransferItemList = {
        add: vi.fn(),
        clear: vi.fn(),
        remove: vi.fn(),
        length: 0,
        [Symbol.iterator]: function* () { yield* []; }
    } as any;
    types: string[] = [];
    files: FileList = { length: 0, item: () => null } as any;

    clearData(): void {}
    getData(): string { return ''; }
    setData(): boolean { return false; }
    setDragImage(): void {}
}

class MockFile implements File {
    lastModified: number = Date.now();
    name: string;
    size: number = 0;
    type: string;
    webkitRelativePath: string = '';

    constructor(bits: BlobPart[], fileName: string, options?: FilePropertyBag) {
        this.name = fileName;
        this.type = options?.type || 'application/octet-stream';
    }

    arrayBuffer(): Promise<ArrayBuffer> {
        return Promise.resolve(new ArrayBuffer(0));
    }

    slice(): Blob {
        return new Blob();
    }

    stream(): ReadableStream {
        return new ReadableStream();
    }

    text(): Promise<string> {
        return Promise.resolve('');
    }
}

// Mock de ClipboardEvent
function createMockClipboardEvent() {
    const MockClipboardEventClass = function(type: string, eventInitDict?: ClipboardEventInit) {
        const event = new Event(type, eventInitDict);
        Object.defineProperty(event, 'clipboardData', {
            value: eventInitDict?.clipboardData || null,
            writable: false
        });
        return event;
    } as any;

    // Définir les propriétés statiques
    MockClipboardEventClass.NONE = 0;
    MockClipboardEventClass.CAPTURING_PHASE = 1;
    MockClipboardEventClass.AT_TARGET = 2;
    MockClipboardEventClass.BUBBLING_PHASE = 3;

    return MockClipboardEventClass;
}

const MockClipboardEvent = vi.fn(createMockClipboardEvent());

// Remplacer les constructeurs globaux
vi.stubGlobal('DataTransfer', MockDataTransfer);
vi.stubGlobal('File', MockFile);
vi.stubGlobal('ClipboardEvent', MockClipboardEvent);

// Configuration globale pour Vitest
beforeEach(() => {
    vi.clearAllMocks();
}); 