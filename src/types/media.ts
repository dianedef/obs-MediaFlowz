/**
 * Interface pour les dimensions d'un média
 */
export interface MediaDimensions {
    scale: number;
    width?: number;
    height?: number;
}

/**
 * Interface pour les métadonnées d'un média
 */
export interface MediaMetadata {
    width?: number;
    height?: number;
    type?: string;
    size?: number;
    lastModified?: number;
}

/**
 * Interface pour les options de redimensionnement
 */
export interface ResizeOptions {
    maintainAspectRatio?: boolean;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

/**
 * Interface pour les événements de média
 */
export interface MediaEvent {
    url: string;
    type: string;
    metadata?: MediaMetadata;
    error?: Error;
}

/**
 * Types de liens média supportés
 */
export enum MediaLinkType {
    LOCAL = 'local',
    WIKI = 'wiki',
    EXTERNAL = 'external',
    CLOUDINARY = 'cloudinary',
    BUNNY = 'bunny',
    CLOUDFLARE = 'cloudflare',
    TWICPICS = 'twicpics'
}

/**
 * Interface pour les informations de lien média
 */
export interface MediaLinkInfo {
    /** URL originale du média */
    originalUrl: string;
    /** URL résolue (pour les liens locaux) */
    resolvedUrl: string;
    /** Type de lien */
    type: MediaLinkType;
    /** Texte alternatif */
    altText?: string;
    /** Dimensions du média */
    dimensions?: {
        scale: number;
        width?: number;
        height?: number;
    };
    /** Indique si le média a eu une erreur de chargement */
    error?: boolean;
    /** Métadonnées spécifiques au service */
    serviceMetadata?: {
        /** ID public sur le service */
        publicId?: string;
        /** Nom de la zone de stockage (Bunny) */
        storageZone?: string;
        /** Hash de livraison (Cloudflare) */
        deliveryHash?: string;
        /** Autres métadonnées */
        [key: string]: any;
    };
} 