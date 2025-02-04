import { vi } from 'vitest';
import { EventName } from '../../../src/core/types/events';
import { IPluginSettings } from '../../../src/core/types/settings';

type EventMap = {
   [EventName.SETTINGS_UPDATED]: { settings: IPluginSettings };
   [EventName.MEDIA_PASTED]: { files: FileList };
   [EventName.MEDIA_UPLOADED]: { url: string; fileName: string };
   [EventName.MEDIA_UPLOAD_ERROR]: { error: Error; fileName: string };
   [EventName.TEST_EVENT]: any;
   [key: string]: any;
};

type EventCallback<T extends EventName | string> = (data: EventMap[T]) => void;

class EventBusServiceMock {
   private listeners: Map<EventName | string, Set<EventCallback<any>>>;

   constructor() {
      this.listeners = new Map();
   }

   on<T extends EventName | string>(event: T, callback: EventCallback<T>): void {
      if (!this.listeners.has(event)) {
         this.listeners.set(event, new Set());
      }
      this.listeners.get(event)?.add(callback);
   }

   off<T extends EventName | string>(event: T, callback: EventCallback<T>): void {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
         eventListeners.delete(callback);
         if (eventListeners.size === 0) {
            this.listeners.delete(event);
         }
      }
   }

   emit<T extends EventName | string>(event: T, data: EventMap[T]): void {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
         eventListeners.forEach(callback => {
            try {
               callback(data);
            } catch (error) {
               console.error(`Error in event listener for ${event}:`, error);
            }
         });
      }
   }

   once<T extends EventName | string>(event: T, callback: EventCallback<T>): void {
      const onceCallback = (data: EventMap[T]) => {
         this.off(event, onceCallback);
         callback(data);
      };
      this.on(event, onceCallback);
   }

   getListenerCount(event: EventName | string): number {
      return this.listeners.get(event)?.size ?? 0;
   }

   clearAllListeners(): void {
      this.listeners.clear();
   }
}

const createMockEventBus = () => {
   const eventBus = new EventBusServiceMock();
   vi.spyOn(eventBus, 'on');
   vi.spyOn(eventBus, 'off');
   vi.spyOn(eventBus, 'emit');
   vi.spyOn(eventBus, 'once');
   vi.spyOn(eventBus, 'getListenerCount');
   return eventBus;
};

export class MockEventBusService {
   private static instance: EventBusServiceMock | undefined;
   
   static getInstance() {
      if (!MockEventBusService.instance) {
         MockEventBusService.instance = createMockEventBus();
      }
      return MockEventBusService.instance;
   }

   static cleanup() {
      if (MockEventBusService.instance) {
         MockEventBusService.instance.clearAllListeners();
         MockEventBusService.instance = undefined;
      }
   }
}

export const mockEventBusServiceFactory = () => ({
   EventBusService: MockEventBusService
}); 