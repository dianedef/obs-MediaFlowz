import { TViewMode } from '@/types';

/**
 * Types pour les paramètres de configuration des différents services.
 * Chaque service a ses propres paramètres spécifiques.
 */

/**
 * Paramètres Cloudinary
 * @see {@link https://cloudinary.com/documentation/upload_images#upload_options}
 */
export interface ICloudinarySettings {
    /** Clé API Cloudinary */
    apiKey: string;
    /** Secret API Cloudinary */
    apiSecret: string;
    /** Nom du cloud Cloudinary */
    cloudName: string;
    /** Preset d'upload non signé (optionnel) */
    uploadPreset?: string;
}

/**
 * Paramètres TwicPics
 * @see {@link https://www.twicpics.com/docs/api/upload}
 */
export interface ITwicPicsSettings {
    /** Domaine TwicPics (ex: your-workspace.twicpics.com) */
    domain: string;
    /** Clé API TwicPics */
    apiKey: string;
    /** Chemin TwicPics (optionnel) */
    path?: string;
}

/**
 * Paramètres Cloudflare
 * @see {@link https://developers.cloudflare.com/images}
 * @see {@link https://developers.cloudflare.com/stream}
 */
export interface ICloudflareSettings {
    /** ID du compte Cloudflare */
    accountId: string;
    /** Token API pour Cloudflare Images et Stream */
    imagesToken: string;
    /** Hash de livraison pour les URLs d'images */
    deliveryHash?: string;
    /** Variant par défaut pour les images */
    defaultVariant?: string;
    /** Domaine personnalisé */
    customDomain?: string;
}

/**
 * Configuration d'une zone de stockage Bunny.net
 */
export interface IBunnyStorageZone {
    /** Nom de la zone de stockage sur Bunny.net */
    name: string;
    /** Clé d'accès FTP/API de la zone de stockage */
    accessKey: string;
    /** URL de la Pull Zone associée (ex: cdn.votredomaine.com) */
    pullZoneUrl: string;
    /** Dossiers associés à cette zone de stockage */
    folders?: string[];
    /** CDN personnalisé pour cette zone */
    customCDN?: string;
}

/**
 * Paramètres Bunny.net
 * @see {@link https://docs.bunny.net/reference/storage-api}
 */
export interface IBunnySettings {
    /** Zones de stockage configurées */
    storageZones: IBunnyStorageZone[];
    /** Zone de stockage par défaut */
    defaultStorageZone?: string;
    /** Utiliser les dossiers associés */
    useFolderMapping: boolean;
}

/**
 * Type des services supportés
 */
export enum SupportedService {
    CLOUDINARY = 'cloudinary',
    TWICPICS = 'twicpics',
    CLOUDFLARE = 'cloudflare',
    BUNNY = 'bunny'
}

/**
 * Paramètres pour les dossiers ignorés
 */
export interface IIgnoredFoldersSettings {
    /** Créer un dossier par note */
    useNoteFolders: boolean;
}

/**
 * Configuration globale du plugin
 */
export interface IPluginSettings {
    /** Service actif */
    service: string;
    /** Mode d'affichage actuel */
    currentMode: TViewMode;
    /** Configuration Cloudinary */
    cloudinary: {
        cloudName: string;
        apiKey: string;
        apiSecret: string;
        uploadPreset: string;
        folder: string;
    };
    /** Configuration TwicPics */
    twicpics?: ITwicPicsSettings;
    /** Configuration Cloudflare */
    cloudflare?: ICloudflareSettings;
    /** Configuration Bunny.net */
    bunny?: IBunnySettings;
    /** Liste des dossiers à ignorer */
    ignoredFolders: string[];
    /** Paramètres des dossiers ignorés */
    ignoredFoldersSettings: IIgnoredFoldersSettings;
    /** Barre d'outils */
    showImageToolbar: boolean;
    /** Boutons de la barre d'outils */
    toolbarButtons: {
        copyImage: boolean;
        copyLink: boolean;
        fullscreen: boolean;
        openInDefaultApp: boolean;
        showInExplorer: boolean;
        revealInNavigation: boolean;
        renameImage: boolean;
        addCaption: boolean;
        resizeImage: boolean;
    };
    /** Types de médias activés */
    enabledMediaTypes: {
        images: boolean;
        videos: boolean;
        gifs: boolean;
    };
    /** Taille par défaut des images */
    defaultImageWidth: 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
    /** Modifier la taille avec alt + scroll */
    enableAltScroll: boolean;
    /** Actions des clics de souris */
    mouseActions: {
        /** Action du clic du milieu */
        middleClick: {
            enabled: boolean;
            action: string;
        };
        /** Action du clic droit */
        rightClick: {
            enabled: boolean;
            action: string;
        };
    };
    /** Paramètres d'optimisation des images */
    imageOptimization: {
        /** Mode d'optimisation */
        mode: 'smart' | 'manual';
        /** Paramètres du mode intelligent */
        smartMode: {
            /** Taille maximale en Ko */
            maxSizeKb: number;
            /** Qualité minimale acceptable (1-100) */
            minQuality: number;
            /** DPI cible */
            targetDPI: number;
        };
        /** Paramètres du mode manuel */
        manualMode: {
            /** Qualité de compression (1-100) */
            quality: number;
        };
    };
    /** Configuration Bunny.net */
    bunnycdn: {
        storageZoneName: string;
        apiKey: string;
        region: string;
        pullZone: string;
    };
    /** Features */
    features: {
        imageResize: boolean;
    };
}

/**
 * Structure minimale des paramètres initiaux
 */
export const DEFAULT_SETTINGS: IPluginSettings = {
    service: 'cloudinary',
    currentMode: 'tab',
    cloudinary: {
        cloudName: '',
        apiKey: '',
        apiSecret: '',
        uploadPreset: '',
        folder: ''
    },
    ignoredFolders: [],
    ignoredFoldersSettings: {
        useNoteFolders: false
    },
    showImageToolbar: true,
    toolbarButtons: {
        copyImage: true,
        copyLink: true,
        fullscreen: true,
        openInDefaultApp: true,
        showInExplorer: true,
        revealInNavigation: true,
        renameImage: true,
        addCaption: true,
        resizeImage: true
    },
    cloudflare: {
        accountId: '',
        imagesToken: ''
    },
    enabledMediaTypes: {
        images: true,
        videos: true,
        gifs: true
    },
    defaultImageWidth: 'medium',
    enableAltScroll: true,
    mouseActions: {
        middleClick: {
            enabled: true,
            action: 'none'
        },
        rightClick: {
            enabled: true,
            action: 'none'
        }
    },
    imageOptimization: {
        mode: 'smart',
        smartMode: {
            maxSizeKb: 500,  // 500Ko max par défaut
            minQuality: 80,  // Ne pas descendre sous 80% de qualité
            targetDPI: 144   // DPI standard pour écrans haute résolution
        },
        manualMode: {
            quality: 85
        }
    },
    bunny: {
        storageZones: [],
        defaultStorageZone: '',
        useFolderMapping: true,
        customCDNs: {}
    },
    bunnycdn: {
        storageZoneName: '',
        apiKey: '',
        region: '',
        pullZone: ''
    },
    features: {
        imageResize: true
    }
}; 