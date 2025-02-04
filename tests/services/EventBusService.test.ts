import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBusService } from '../../src/core/services/EventBusService';
import { EventName } from '../../src/core/types/events';

describe('EventBusService', () => {
    let eventBus: EventBusService;

    beforeEach(() => {
        // Reset le singleton pour chaque test
        // @ts-ignore - Accès à la propriété privée pour les tests
        EventBusService.instance = undefined;
        eventBus = EventBusService.getInstance();
    });

    it('should be a singleton', () => {
        const instance1 = EventBusService.getInstance();
        const instance2 = EventBusService.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should register and trigger event listeners', () => {
        const mockCallback = vi.fn();
        eventBus.on(EventName.TEST_EVENT, mockCallback);
        
        eventBus.emit(EventName.TEST_EVENT, { data: 'test-data' });
        expect(mockCallback).toHaveBeenCalledWith({ data: 'test-data' });
    });

    it('should handle multiple listeners for same event', () => {
        const mockCallback1 = vi.fn();
        const mockCallback2 = vi.fn();
        
        eventBus.on(EventName.TEST_EVENT, mockCallback1);
        eventBus.on(EventName.TEST_EVENT, mockCallback2);
        
        eventBus.emit(EventName.TEST_EVENT, { data: 'test-data' });
        
        expect(mockCallback1).toHaveBeenCalledWith({ data: 'test-data' });
        expect(mockCallback2).toHaveBeenCalledWith({ data: 'test-data' });
        expect(eventBus.getListenerCount(EventName.TEST_EVENT)).toBe(2);
    });

    it('should remove listeners correctly', () => {
        const mockCallback = vi.fn();
        eventBus.on(EventName.TEST_EVENT, mockCallback);
        
        eventBus.off(EventName.TEST_EVENT, mockCallback);
        eventBus.emit(EventName.TEST_EVENT, {});
        
        expect(mockCallback).not.toHaveBeenCalled();
        expect(eventBus.getListenerCount(EventName.TEST_EVENT)).toBe(0);
    });

    it('should handle once listeners', () => {
        const mockCallback = vi.fn();
        eventBus.once(EventName.TEST_EVENT, mockCallback);
        
        eventBus.emit(EventName.TEST_EVENT, { data: 'first-call' });
        eventBus.emit(EventName.TEST_EVENT, { data: 'second-call' });
        
        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledWith({ data: 'first-call' });
        expect(eventBus.getListenerCount(EventName.TEST_EVENT)).toBe(0);
    });

    it('should handle errors in listeners gracefully', () => {
        const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const errorCallback = () => { throw new Error('Test error'); };
        const normalCallback = vi.fn();
        
        eventBus.on(EventName.TEST_EVENT, errorCallback);
        eventBus.on(EventName.TEST_EVENT, normalCallback);
        
        eventBus.emit(EventName.TEST_EVENT, {});
        
        expect(mockConsoleError).toHaveBeenCalled();
        expect(normalCallback).toHaveBeenCalled();
        
        mockConsoleError.mockRestore();
    });

    it('should not throw when emitting event with no listeners', () => {
        expect(() => {
            eventBus.emit(EventName.TEST_EVENT, { data: 'test' });
        }).not.toThrow();
    });

    it('should not throw when removing non-existent listener', () => {
        const callback = vi.fn();
        expect(() => {
            eventBus.off(EventName.TEST_EVENT, callback);
        }).not.toThrow();
    });

    it('should execute listeners in order of registration', () => {
        const order: number[] = [];
        
        eventBus.on(EventName.TEST_EVENT, () => order.push(1));
        eventBus.on(EventName.TEST_EVENT, () => order.push(2));
        eventBus.on(EventName.TEST_EVENT, () => order.push(3));
        
        eventBus.emit(EventName.TEST_EVENT, {});
        
        expect(order).toEqual([1, 2, 3]);
    });

    it('should properly clean up listeners to prevent memory leaks', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        
        // Ajout de plusieurs listeners
        eventBus.on(EventName.TEST_EVENT, callback1);
        eventBus.on(EventName.TEST_EVENT, callback2);
        expect(eventBus.getListenerCount(EventName.TEST_EVENT)).toBe(2);
        
        // Suppression des listeners
        eventBus.off(EventName.TEST_EVENT, callback1);
        eventBus.off(EventName.TEST_EVENT, callback2);
        
        // Vérification que la Map est bien nettoyée
        expect(eventBus.getListenerCount(EventName.TEST_EVENT)).toBe(0);
    });

    it('should handle multiple event types independently', () => {
        const testCallback = vi.fn();
        const settingsCallback = vi.fn();
        
        eventBus.on(EventName.TEST_EVENT, testCallback);
        eventBus.on(EventName.SETTINGS_UPDATED, settingsCallback);
        
        eventBus.emit(EventName.TEST_EVENT, { data: 'test' });
        
        expect(testCallback).toHaveBeenCalled();
        expect(settingsCallback).not.toHaveBeenCalled();
    });

    it('should maintain type safety for different events', () => {
        const settingsCallback = vi.fn();
        eventBus.on(EventName.SETTINGS_UPDATED, settingsCallback);
        
        const settings = { language: 'fr' };
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings });
        
        expect(settingsCallback).toHaveBeenCalledWith({ settings });
    });
}); 