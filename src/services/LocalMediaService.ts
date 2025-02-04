import { App, TFile } from 'obsidian';
import { IMediaUploadService, IUploadResponse, IUploadOptions } from '@/types/IMediaUploadService';
import { ImagePathService } from '@/utils/ImagePathService';

export class LocalMediaService implements IMediaUploadService {
    private static instance: LocalMediaService | null = null;
    private app: App;
    private imagePathService: ImagePathService;

    private constructor(app: App) {
        this.app = app;
        this.imagePathService = ImagePathService.getInstance(app);
    }

    public static getInstance(app: App): LocalMediaService {
        if (!LocalMediaService.instance) {
            LocalMediaService.instance = new LocalMediaService(app);
        }
        return LocalMediaService.instance;
    }

    async upload(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        const fileName = file.name;
        const buffer = await file.arrayBuffer();
        const path = options?.folder ? `${options.folder}/${fileName}` : fileName;

        try {
            await this.app.vault.createBinary(path, buffer);
            return {
                url: path,
                publicId: path,
                metadata: {
                    id: path,
                    type: file.type.startsWith('image/') ? 'image' : 'video'
                }
            };
        } catch (error) {
            throw new Error(`Erreur lors de la sauvegarde du fichier local: ${error}`);
        }
    }

    async delete(publicId: string): Promise<void> {
        console.log('🔍 Tentative de suppression du fichier:', {
            publicId,
            filesInVault: this.app.vault.getFiles().map(f => f.path)
        });

        try {
            let relativePath = publicId;
            
            // Si c'est une URL valide, extraire le chemin
            if (publicId.startsWith('http') || publicId.startsWith('app://')) {
                const url = new URL(publicId);
                const fullPath = decodeURIComponent(url.pathname);
                const parts = fullPath.split('Dev - Plugin Obsidian/');
                relativePath = parts[parts.length - 1].split('?')[0];
            }
            
            const activeFile = this.app.workspace.getActiveFile();
            const sourcePath = activeFile ? activeFile.path : '';
            
            const file = this.imagePathService.getImageFile(relativePath, sourcePath);

            if (!file) {
                throw new Error(`Le fichier "${relativePath}" n'a pas été trouvé dans le vault`);
            }

            console.log('📂 Fichier trouvé:', file.path);
            await this.app.vault.delete(file);
        } catch (error) {
            console.error('❌ Erreur lors de la suppression:', error);
            throw error;
        }
    }

    getUrl(publicId: string): string {
        const file = this.app.vault.getAbstractFileByPath(publicId);
        if (file instanceof TFile) {
            return this.app.vault.getResourcePath(file);
        }
        return publicId;
    }

    isConfigured(): boolean {
        return true; // Le service local est toujours configuré
    }

    async rename(oldName: string, newName: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(oldName);
        if (file instanceof TFile) {
            await this.app.fileManager.renameFile(file, newName);
        }
    }

    async move(newPath: string): Promise<string | void> {
        const file = this.app.vault.getAbstractFileByPath(newPath);
        if (file instanceof TFile) {
            await this.app.fileManager.renameFile(file, newPath);
            return newPath;
        }
    }

    public static cleanup(): void {
        LocalMediaService.instance = null;
    }
} 