import { Command, Plugin } from 'obsidian';
import { BaseService } from './BaseService';
import { EventName } from '../types/events';
import { getTranslation } from '../core/Translations';

interface CommandDefinition {
    id: string;
    name: string;
    hotkeys?: Array<{
        modifiers: string[];
        key: string;
    }>;
    callback: () => void;
}

/**
 * Service gérant les commandes et raccourcis clavier du plugin.
 */
export class CommandService extends BaseService {
    private static instance: CommandService;
    private plugin: Plugin;
    private commands: Map<string, Command>;

    private constructor(plugin: Plugin) {
        super();
        this.plugin = plugin;
        this.commands = new Map();
        this.init();
    }

    public static getInstance(plugin?: Plugin): CommandService {
        if (!CommandService.instance) {
            if (!plugin) {
                throw new Error('Plugin instance required for CommandService initialization');
            }
            CommandService.instance = new CommandService(plugin);
        }
        return CommandService.instance;
    }

    protected init(): void {
        // Définir les commandes de base
        this.registerCommand({
            id: 'toggle-feature',
            name: getTranslation('commands.toggleFeature'),
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'F' }],
            callback: () => {
                try {
                    this.eventBus.emit(EventName.TOGGLE_FEATURE);
                } catch (error) {
                    this.errorService.handleError({
                        type: 'command',
                        message: getTranslation('errors.commandFailed'),
                        originalError: error as Error
                    });
                }
            }
        });
    }

    /**
     * Enregistre une nouvelle commande.
     */
    public registerCommand(command: CommandDefinition): void {
        if (this.commands.has(command.id)) {
            console.warn(`Command ${command.id} already registered`);
            return;
        }

        const obsidianCommand = this.plugin.addCommand({
            id: command.id,
            name: command.name,
            hotkeys: command.hotkeys,
            callback: () => {
                try {
                    command.callback();
                } catch (error) {
                    this.errorService.handleError({
                        type: 'command',
                        message: getTranslation('errors.commandFailed'),
                        originalError: error as Error
                    });
                }
            }
        });

        this.commands.set(command.id, obsidianCommand);
    }

    /**
     * Supprime une commande enregistrée.
     */
    public unregisterCommand(id: string): void {
        this.commands.delete(id);
    }

    /**
     * Supprime toutes les commandes.
     */
    public clearCommands(): void {
        this.commands.clear();
    }
} 