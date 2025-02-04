import { Notice } from 'obsidian';
import { EventBusService } from './EventBusService';
import { EventName } from '../types/events';
import { getTranslation } from '../core/Translations';

/**
 * Types d'erreurs possibles dans l'application
 */
export enum ErrorType {
    /** Erreurs de configuration */
    CONFIG = 'config',
    /** Erreurs d'upload */
    UPLOAD = 'upload',
    /** Erreurs d'édition */
    EDITOR = 'editor',
    /** Erreurs réseau */
    NETWORK = 'network',
    /** Erreurs inattendues */
    UNEXPECTED = 'unexpected'
}

/**
 * Interface pour une erreur structurée
 */
export interface StructuredError {
    type: ErrorType;
    message: string;
    originalError?: Error;
    context?: Record<string, unknown>;
}

/**
 * Service de gestion centralisée des erreurs.
 * Gère le logging, l'affichage et le reporting des erreurs.
 */
export class ErrorService {
    private static instance: ErrorService | undefined;
    private readonly eventBus: EventBusService;

    private constructor() {
        this.eventBus = EventBusService.getInstance();
        this.setupEventListeners();
    }

    public static getInstance(): ErrorService {
        if (!ErrorService.instance) {
            ErrorService.instance = new ErrorService();
        }
        return ErrorService.instance;
    }

    private setupEventListeners(): void {
        // Écouter les erreurs d'upload
        this.eventBus.on(EventName.MEDIA_UPLOAD_ERROR, ({ error, fileName }) => {
            this.handleError({
                type: ErrorType.UPLOAD,
                message: getTranslation('errors.uploadFailed'),
                originalError: error,
                context: { fileName }
            });
        });
    }

    /**
     * Gère une erreur de manière centralisée
     */
    public handleError(error: StructuredError): void {
        // Log l'erreur avec son contexte
        console.error('[MediaFlowz]', {
            type: error.type,
            message: error.message,
            error: error.originalError,
            context: error.context
        });

        // Afficher une notification à l'utilisateur
        this.showErrorNotice(error);

        // Si c'est une erreur inattendue, on pourrait envoyer un rapport
        if (error.type === ErrorType.UNEXPECTED) {
            this.reportError(error);
        }
    }

    /**
     * Crée une erreur structurée à partir d'une erreur brute
     */
    public createError(
        type: ErrorType,
        messageKey: string,
        originalError?: Error,
        context?: Record<string, unknown>
    ): StructuredError {
        return {
            type,
            message: getTranslation(messageKey),
            originalError,
            context
        };
    }

    /**
     * Affiche une notification d'erreur à l'utilisateur
     */
    private showErrorNotice(error: StructuredError): void {
        let message = error.message;

        // Ajouter des détails selon le type d'erreur
        if (error.type === ErrorType.CONFIG) {
            message += '\n' + getTranslation('errors.checkSettings');
        } else if (error.type === ErrorType.NETWORK) {
            message += '\n' + getTranslation('errors.checkConnection');
        }

        new Notice(message, 5000); // Afficher pendant 5 secondes
    }

    /**
     * Envoie un rapport d'erreur (à implémenter si besoin)
     */
    private reportError(error: StructuredError): void {
        // TODO: Implémenter si on veut collecter les erreurs
        // Par exemple, envoyer à un service de monitoring
    }

    /**
     * Vérifie si une erreur est de type réseau
     */
    public isNetworkError(error: Error): boolean {
        return error instanceof TypeError && 
            (error.message.includes('network') || error.message.includes('fetch'));
    }

    /**
     * Vérifie si une erreur est liée à la configuration
     */
    public isConfigError(error: Error): boolean {
        return error.message.includes('not configured') || 
               error.message.includes('invalid settings');
    }

    /**
     * Nettoie l'instance.
     * À utiliser principalement dans les tests.
     */
    public static cleanup(): void {
        ErrorService.instance = undefined;
    }
} 