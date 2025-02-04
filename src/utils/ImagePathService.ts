import { App, TFile } from 'obsidian';
import { SettingsService } from '@/core/SettingsService';

/**
 * Service pour gérer les chemins d'images dans Obsidian
 */
export class ImagePathService {
    private static instance: ImagePathService | null = null;
    private app: App;
    private settingsService: SettingsService;

    private constructor(app: App) {
        this.app = app;
        this.settingsService = SettingsService.getInstance();
    }

    public static getInstance(app: App): ImagePathService {
        if (!ImagePathService.instance) {
            ImagePathService.instance = new ImagePathService(app);
        }
        return ImagePathService.instance;
    }

    /**
     * Nettoie le chemin de l'image en retirant les métadonnées
     */
    public cleanPath(path: string): string {
        return path.split('|')[0].trim();
    }

    /**
     * Obtient le chemin complet d'une image
     */
    public getFullPath(src: string, sourcePath: string): string {
        try {
            const cleanSrc = this.cleanPath(src);

            // Si c'est une URL, la retourner telle quelle
            if (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')) {
                return cleanSrc;
            }

            // Essayer de résoudre via le cache de métadonnées
            const file = this.app.metadataCache.getFirstLinkpathDest(cleanSrc, sourcePath);
            if (file instanceof TFile) {
                return this.app.vault.getResourcePath(file);
            }

            // Essayer de résoudre via le chemin absolu
            const absoluteFile = this.app.vault.getAbstractFileByPath(cleanSrc);
            if (absoluteFile instanceof TFile) {
                return this.app.vault.getResourcePath(absoluteFile);
            }

            // Essayer de résoudre via le chemin relatif au fichier actif
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                const basePath = activeFile.path.substring(0, activeFile.path.lastIndexOf('/'));
                const possiblePath = `${basePath}/${cleanSrc}`;
                const relativeFile = this.app.vault.getAbstractFileByPath(possiblePath);
                if (relativeFile instanceof TFile) {
                    return this.app.vault.getResourcePath(relativeFile);
                }
            }

            // Si aucune résolution ne fonctionne, retourner le chemin original
            return src;
        } catch (error) {
            console.error('❌ Erreur lors de la résolution du chemin de l\'image:', error);
            return src;
        }
    }

    /**
     * Vérifie si un chemin est une URL
     */
    public isUrl(path: string): boolean {
        return path.startsWith('http://') || path.startsWith('https://');
    }

    /**
     * Obtient le TFile correspondant à une image
     */
    public getImageFile(path: string, sourcePath: string): TFile | null {
        try {
            const cleanPath = this.cleanPath(path);
            
            // Essayer d'abord via le cache de métadonnées
            const fileFromCache = this.app.metadataCache.getFirstLinkpathDest(cleanPath, sourcePath);
            if (fileFromCache instanceof TFile) {
                return fileFromCache;
            }

            // Essayer ensuite le chemin absolu
            const absoluteFile = this.app.vault.getAbstractFileByPath(cleanPath);
            if (absoluteFile instanceof TFile) {
                return absoluteFile;
            }

            // Enfin, essayer le chemin relatif
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                const basePath = activeFile.path.substring(0, activeFile.path.lastIndexOf('/'));
                const possiblePath = `${basePath}/${cleanPath}`;
                const relativeFile = this.app.vault.getAbstractFileByPath(possiblePath);
                if (relativeFile instanceof TFile) {
                    return relativeFile;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du fichier image:', error);
            return null;
        }
    }

    protected isInIgnoredFolder(filePath: string, folder: string): boolean {
        const settings = this.settingsService.getSettings();
        if (!settings.ignoredFolders || settings.ignoredFolders.length === 0) {
            return false;
        }

        const normalizedPath = filePath.replace(/\\/g, '/');
        const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        return normalizedPath.startsWith(normalizedFolder + '/') || normalizedPath === normalizedFolder;
    }

    /**
     * Obtient le chemin relatif d'une image par rapport à un fichier source
     */
    public getRelativePath(imagePath: string, sourcePath: string): string {
        const file = this.getImageFile(imagePath, sourcePath);
        if (file) {
            return this.app.metadataCache.fileToLinktext(file, sourcePath, true);
        }
        return imagePath;
    }

    public static cleanup(): void {
        ImagePathService.instance = null;
    }
} 