import { requestUrl } from 'obsidian';

/**
 * Configuration du service PicGo
 */
export interface IPicGoConfig {
    /** Identifiant du compte Cloudflare */
    accountId: string;
    /** Token d'API Cloudflare */
    token: string;
    /** Domaine personnalisé optionnel */
    customDomain?: string;
}

/**
 * Service de gestion des uploads via PicGo
 * Adapté pour l'API Cloudflare Images
 */
export class PicGoService {
    private config: IPicGoConfig;

    /**
     * Crée une nouvelle instance du service PicGo
     * @param {IPicGoConfig} config - Configuration du service
     */
    constructor(config: IPicGoConfig) {
        this.config = config;
    }

    /**
     * Convertit un fichier en base64
     * @param {File} file - Le fichier à convertir
     * @returns {Promise<string>} Le fichier encodé en base64
     * @private
     */
    private async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result as string;
                resolve(base64.split(',')[1]);
            };
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Upload un fichier vers Cloudflare Images
     * @param {File} file - Le fichier à uploader
     * @returns {Promise<{url: string, id: string}>} L'URL et l'ID du fichier uploadé
     */
    async upload(file: File): Promise<{ url: string; id: string }> {
        try {
            const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/images/v1`;
            const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
            let body = '';
            body += `--${boundary}\r\n`;
            body += `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n`;
            body += `Content-Type: ${file.type}\r\n\r\n`;
            body += await this.fileToBase64(file);
            body += `\r\n--${boundary}--\r\n`;

            const response = await requestUrl({
                url: apiUrl,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`
                },
                body: body
            });

            const data = response.json;
            
            if (!data.success || !data.result?.id) {
                throw new Error(data.errors?.[0]?.message || 'Upload failed');
            }

            const imageId = data.result.id;
            const baseUrl = this.config.customDomain || `https://imagedelivery.net/${this.config.accountId}`;
            const imageUrl = `${baseUrl}/${imageId}/public`;

            return {
                url: imageUrl,
                id: imageId
            };
        } catch (error) {
            console.error('❌ Erreur d\'upload:', error);
            throw error;
        }
    }

    /**
     * Supprime une image de Cloudflare Images
     * @param {string} imageId - L'identifiant de l'image à supprimer
     * @returns {Promise<void>}
     */
    async delete(imageId: string): Promise<void> {
        try {
            const response = await requestUrl({
                url: `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/images/v1/${imageId}`,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.json.success) {
                throw new Error('Delete failed');
            }
        } catch (error) {
            console.error('❌ Erreur de suppression:', error);
            throw error;
        }
    }
} 