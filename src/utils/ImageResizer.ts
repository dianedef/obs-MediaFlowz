import { App } from 'obsidian';
import { EventBusService } from '@/services/EventBusService';
import { EventName } from '@/types/events';

/**
 * Classe singleton gérant le redimensionnement des images
 * avec ALT + molette de la souris
 */
export class ImageResizer {
    private static instance: ImageResizer;
    private enabled: boolean = false;
    private app: App;

    private constructor(app: App) {
        this.app = app;
    }

    /**
     * Obtenir l'instance unique de ImageResizer
     */
    public static getInstance(app: App): ImageResizer {
        if (!ImageResizer.instance) {
            ImageResizer.instance = new ImageResizer(app);
        }
        return ImageResizer.instance;
    }

    /**
     * Activer le redimensionnement des images
     */
    public enable(): void {
        if (this.enabled) return;
        this.enabled = true;
        
        document.addEventListener('wheel', this.handleScroll, { passive: false });
    }

    /**
     * Désactiver le redimensionnement des images
     */
    public disable(): void {
        if (!this.enabled) return;
        this.enabled = false;
        
        document.removeEventListener('wheel', this.handleScroll);
    }

    /**
     * Gérer l'événement de la molette
     */
    private handleScroll = (event: WheelEvent) => {
        if (!event.altKey) return;

        const target = event.target as HTMLElement;
        const container = target.closest('.mediaflowz-image-preview-wrapper');
        if (!container) return;

        event.preventDefault();
        
        const widget = container.closest('.mediaflowz-image-buttons-wrapper');
        const slider = widget?.querySelector('.mediaflowz-image-slider') as HTMLInputElement;
        if (!slider) return;

        const delta = event.deltaY;
        const step = parseFloat(slider.step) || 1;
        const min = parseFloat(slider.min) || 1;
        const max = parseFloat(slider.max) || 5;
        const currentValue = parseFloat(slider.value);
        const newValue = Math.max(min, Math.min(max, currentValue - (delta > 0 ? step : -step)));
        
        slider.value = String(newValue);
        
        // Déclencher l'événement input pour la mise à jour visuelle immédiate
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Utiliser requestAnimationFrame pour la mise à jour du lien markdown
        requestAnimationFrame(() => {
            slider.dispatchEvent(new Event('change', { bubbles: true }));
        });
    };
} 