/**
 * Interface pour les services de gestion des médias
 */
export interface IMediaUploadService {
    /** Upload un fichier et retourne sa réponse */
    upload(file: File, options?: IUploadOptions): Promise<IUploadResponse>;
    /** Supprime un fichier via son ID public */
    delete(publicId: string): Promise<void>;
    /** Obtient l'URL d'un fichier via son ID public */
    getUrl(publicId: string, transformation?: string): string;
    /** Vérifie si le service est correctement configuré */
    isConfigured(): boolean;
    /** Renomme un fichier (optionnel) */
    rename?(oldName: string, newName: string): Promise<void>;
    /** Déplace un fichier (optionnel) */
    move?(newPath: string): Promise<string | void>;
}

/**
 * Interface pour la réponse d'upload de média
 */
export interface IUploadResponse {
    /** URL du média uploadé */
    url: string;
    /** ID public du média sur le service */
    publicId: string;
    /** Largeur optionnelle */
    width?: number;
    /** Hauteur optionnelle */
    height?: number;
    /** Format du média */
    format?: string;
    /** Métadonnées additionnelles */
    metadata?: {
        id?: string;
        type?: string;
        [key: string]: any;
    };
}

/**
 * Options pour l'upload de média
 */
export interface IUploadOptions {
    /** Dossier de destination */
    folder?: string;
}

/**
 * Interface pour les erreurs de requête
 */
export interface RequestError {
    error: Error;
}

/**
 * Interface pour les erreurs de réponse
 */
export interface ResponseError {
    response: {
        text(): Promise<string>;
    };
} 