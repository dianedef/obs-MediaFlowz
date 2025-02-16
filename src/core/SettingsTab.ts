import { App, PluginSettingTab, Setting, Menu, TFolder, Modal, TextComponent, ButtonComponent } from 'obsidian';
import MediaFlowzPlugin from '../main';
import { getTranslation } from './Translations';
import { 
    SupportedService, 
    ICloudinarySettings,
    ITwicPicsSettings,
    ICloudflareSettings,
    IBunnySettings
} from '../types/settings';
import { EventBusService } from '../services/EventBusService';
import { SettingsService } from './SettingsService';
import { showNotice, NOTICE_DURATIONS } from '../utils/notifications';
import { ImageResizer } from '../utils/ImageResizer';

export class MediaFlowzSettingsTab extends PluginSettingTab {
    plugin: MediaFlowzPlugin;
    private eventBus: EventBusService;
    private settingsService: SettingsService;

    constructor(app: App, plugin: MediaFlowzPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.eventBus = EventBusService.getInstance();
        this.settingsService = SettingsService.getInstance();
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('mediaflowz-settings');

// Section des fonctionnalités
        const featuresSection = containerEl.createDiv('mediaflowz-features-section');
        featuresSection.createEl('h2', { text: getTranslation('settings.features.title') });

        // Taille par défaut des images
        new Setting(featuresSection)
            .setName(getTranslation('settings.imageSize.default'))
            .setDesc(getTranslation('settings.imageSize.default.desc'))
            .addDropdown(dropdown => dropdown
                .addOption('extra-small', getTranslation('settings.imageSize.extraSmall'))
                .addOption('small', getTranslation('settings.imageSize.small'))
                .addOption('medium', getTranslation('settings.imageSize.medium'))
                .addOption('large', getTranslation('settings.imageSize.large'))
                .addOption('extra-large', getTranslation('settings.imageSize.original'))
                .setValue(this.plugin.settings.defaultImageWidth)
                .onChange(async (value) => {
                    this.plugin.settings.defaultImageWidth = value as 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
                    await this.plugin.saveSettings();
                }));
        
// Section de la barre d'outils
        const toolbarSection = featuresSection.createDiv('mediaflowz-toolbar-section');
        new Setting(toolbarSection)
            .setName(getTranslation('settings.features.imageToolbar.name'))
            .setDesc(getTranslation('settings.features.imageToolbar.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showImageToolbar)
                .onChange(async (value) => {
                    this.plugin.settings.showImageToolbar = value;
                    await this.plugin.saveSettings();
                    
                    // Supprimer l'ancienne section si elle existe
                    const existingSection = toolbarSection.querySelector('.mediaflowz-toolbar-buttons-section');
                    if (existingSection) {
                        existingSection.remove();
                    }
                    
                    // Si la barre d'outils est activée, afficher les options
                    if (value) {
                        this.displayToolbarSettings(toolbarSection);
                    }
                })
            );

        // Alt + Scroll
        new Setting(featuresSection)
            .setName(getTranslation('settings.imageSize.altScroll'))
            .setDesc(getTranslation('settings.imageSize.altScroll.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.features.imageResize)
                .onChange(async (value) => {
                    this.plugin.settings.features.imageResize = value;
                    await this.plugin.saveSettings();
                    
                    // Mettre à jour l'état du redimensionneur
                    const imageResizer = ImageResizer.getInstance(this.app);
                    if (value) {
                        imageResizer.enable();
                    } else {
                        imageResizer.disable();
                    }
                })
            );

        
        // Section des actions de souris
        // Clic du milieu
        new Setting(featuresSection)
            .setName(getTranslation('settings.mouseActions.middleClick'))
            .setDesc(getTranslation('settings.mouseActions.middleClick.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mouseActions.middleClick.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.mouseActions.middleClick.enabled = value;
                    await this.plugin.saveSettings();
                })
            )
            .addDropdown(dropdown => {
                dropdown
                    .addOption('none', getTranslation('settings.mouseActions.action.none'))
                    .setValue(this.plugin.settings.mouseActions.middleClick.action)
                    .setDisabled(!this.plugin.settings.mouseActions.middleClick.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.mouseActions.middleClick.action = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Clic droit
        new Setting(featuresSection)
            .setName(getTranslation('settings.mouseActions.rightClick'))
            .setDesc(getTranslation('settings.mouseActions.rightClick.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mouseActions.rightClick.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.mouseActions.rightClick.enabled = value;
                    await this.plugin.saveSettings();
                })
            )
            .addDropdown(dropdown => {
                dropdown
                    .addOption('none', getTranslation('settings.mouseActions.action.none'))
                    .setValue(this.plugin.settings.mouseActions.rightClick.action)
                    .setDisabled(!this.plugin.settings.mouseActions.rightClick.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.mouseActions.rightClick.action = value;
                        await this.plugin.saveSettings();
                    });
            });

// Section d'auto-upload
        const uploadSection = containerEl.createDiv('mediaflowz-upload-section');
        uploadSection.createEl('h2', { text: getTranslation('settings.features.autoupload.title') });

        // Auto-upload toggle
        new Setting(uploadSection)
            .setName(getTranslation('settings.features.autoupload.title'))
            .setDesc(getTranslation('settings.features.autoupload.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.features.autoUpload ?? true)
                .onChange(async (value) => {
                    this.plugin.settings.features.autoUpload = value;
                    await this.plugin.saveSettings();

                    // Nettoyer toutes les sections liées à l'auto-upload
                    const sectionsToRemove = [
                        '.mediaflowz-auto-upload-section',
                        '.mediaflowz-service-section',
                        '.mediaflowz-service-settings-section'
                    ];

                    sectionsToRemove.forEach(selector => {
                        const section = uploadSection.querySelector(selector);
                        if (section) {
                            section.remove();
                        }
                    });
                    
                    // Si l'auto-upload est activé, afficher les options supplémentaires
                    if (value) {
                        this.displayAutoUploadSettings(uploadSection);
                    }
                })
            );

        // Si l'auto-upload est déjà activé, afficher les options
        if (this.plugin.settings.features.autoUpload) {
            this.displayAutoUploadSettings(uploadSection);
        }

// Section d'optimisation des images
        const optimizationSection = containerEl.createDiv('mediaflowz-optimization-section');
        optimizationSection.createEl('h2', { text: getTranslation('settings.imageOptimization.title') });
        optimizationSection.createEl('p', { 
        text: getTranslation('settings.imageOptimization.desc'),
        cls: 'mediaflowz-setting-item-description'
    });

    // Mode d'optimisation
        new Setting(optimizationSection)
        .setName(getTranslation('settings.imageOptimization.mode'))
        .setDesc(getTranslation('settings.imageOptimization.mode.desc'))
        .addDropdown(dropdown => {
            dropdown
                .addOption('smart', getTranslation('settings.imageOptimization.mode.smart'))
                .addOption('manual', getTranslation('settings.imageOptimization.mode.manual'))
                .setValue(this.plugin.settings.imageOptimization.mode)
                .onChange(async (value) => {
                    this.plugin.settings.imageOptimization.mode = value as 'smart' | 'manual';
                    await this.plugin.saveSettings();
                    this.display();
                });
        });

        // Options du mode intelligent
        if (this.plugin.settings.imageOptimization.mode === 'smart') {
            const smartSection = optimizationSection.createDiv('mediaflowz-smart-optimization-section');
            
            // Description du mode intelligent
            smartSection.createEl('p', {
                text: getTranslation('settings.imageOptimization.smart.desc'),
                cls: 'mediaflowz-setting-item-description'
            });
            
            // Taille maximale
            new Setting(smartSection)
                .setName(getTranslation('settings.imageOptimization.smart.maxSize'))
                .setDesc(getTranslation('settings.imageOptimization.smart.maxSize.desc'))
                .addSlider(slider => slider
                    .setLimits(100, 2000, 100)
                    .setValue(this.plugin.settings.imageOptimization.smartMode.maxSizeKb)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.imageOptimization.smartMode.maxSizeKb = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addExtraButton(button => button
                    .setIcon('reset')
                    .setTooltip('Reset to default (500KB)')
                    .onClick(async () => {
                        this.plugin.settings.imageOptimization.smartMode.maxSizeKb = 500;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            // Qualité minimale
            new Setting(smartSection)
                .setName(getTranslation('settings.imageOptimization.smart.minQuality'))
                .setDesc(getTranslation('settings.imageOptimization.smart.minQuality.desc'))
                .addSlider(slider => slider
                    .setLimits(50, 100, 5)
                    .setValue(this.plugin.settings.imageOptimization.smartMode.minQuality)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.imageOptimization.smartMode.minQuality = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addExtraButton(button => button
                    .setIcon('reset')
                    .setTooltip('Reset to default (80%)')
                    .onClick(async () => {
                        this.plugin.settings.imageOptimization.smartMode.minQuality = 80;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            // DPI cible
            new Setting(smartSection)
                .setName(getTranslation('settings.imageOptimization.smart.targetDPI'))
                .setDesc(getTranslation('settings.imageOptimization.smart.targetDPI.desc'))
                .addDropdown(dropdown => dropdown
                    .addOption('72', '72 DPI (Web)')
                    .addOption('144', '144 DPI (HiDPI)')
                    .addOption('300', '300 DPI (Print)')
                    .setValue(this.plugin.settings.imageOptimization.smartMode.targetDPI.toString())
                    .onChange(async (value) => {
                        this.plugin.settings.imageOptimization.smartMode.targetDPI = parseInt(value);
                        await this.plugin.saveSettings();
                    }));
        }

        // Options du mode manuel
        if (this.plugin.settings.imageOptimization.mode === 'manual') {
            const manualSection = optimizationSection.createDiv('mediaflowz-manual-optimization-section');

            // Description du mode manuel
            manualSection.createEl('p', {
                text: getTranslation('settings.imageOptimization.manual.info'),
                cls: 'mediaflowz-setting-item-description'
            });

            // Qualité de compression
            new Setting(manualSection)
                .setName(getTranslation('settings.imageOptimization.manual.quality'))
                .setDesc(getTranslation('settings.imageOptimization.manual.quality.desc'))
                .addSlider(slider => slider
                    .setLimits(1, 100, 1)
                    .setValue(this.plugin.settings.imageOptimization.manualMode.quality)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.imageOptimization.manualMode.quality = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addExtraButton(button => button
                    .setIcon('reset')
                    .setTooltip('Reset to default (85%)')
                    .onClick(async () => {
                        this.plugin.settings.imageOptimization.manualMode.quality = 85;
                        await this.plugin.saveSettings();
                        this.display();
                    }));
        }
    }

    private async updateSettings(newSettings: Partial<typeof this.plugin.settings>): Promise<void> {
        try {
            // Ne garder que les paramètres du service actif
            const service = newSettings.service || this.plugin.settings.service;
            const mergedSettings = {
                ...this.plugin.settings,  // Garder les paramètres existants
                ...newSettings  // Appliquer les nouveaux paramètres
            };

            // Sauvegarder les paramètres sur le disque
            await this.plugin.saveData(mergedSettings);

            // Mettre à jour les paramètres du plugin
            this.plugin.settings = mergedSettings;

            console.log('Settings saved:', mergedSettings);
        } catch (error) {
            console.error('Error updating settings:', error);
            showNotice(
                error instanceof Error ? error.message : 'Erreur de configuration',
                NOTICE_DURATIONS.LONG
            );
        }
    }

    private displayCloudinarySettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: getTranslation('settings.cloudinary.title') });
        
        const description = containerEl.createEl('p', { 
            cls: 'setting-item-description'
        });
        description.innerHTML = `
            ${getTranslation('settings.cloudinary.description')}
            <br><br>
            ${getTranslation('settings.cloudinary.description.features')}
            <ul>
                <li>Uploader l'image vers votre compte Cloudinary</li>
                <li>Insérer le lien de l'image optimisée dans votre note</li>
                <li>Appliquer automatiquement les transformations configurées</li>
            </ul>
            <br>
            ${getTranslation('settings.cloudinary.description.cdn')}
            <br><br>
            ${getTranslation('settings.cloudinary.setup.title')}
            <ul>
                <li>${getTranslation('settings.cloudinary.setup.step1')}</li>
                <li>${getTranslation('settings.cloudinary.setup.step2')}</li>
                <li>${getTranslation('settings.cloudinary.setup.step3')}</li>
            </ul>
        `;

        new Setting(containerEl)
            .setName(getTranslation('settings.cloudinary.cloudName'))
            .setDesc(getTranslation('settings.cloudinary.cloudNameDesc'))
            .addText(text => text
                .setPlaceholder('my-cloud')
                .setValue(this.plugin.settings.cloudinary?.cloudName ?? '')
                .onChange(async (value) => {
                    await this.updateCloudinarySettings({
                            cloudName: value
                    });
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.apiKey'))
            .setDesc(getTranslation('settings.apiKeyDesc'))
            .addText(text => text
                .setPlaceholder('123456789012345')
                .setValue(this.plugin.settings.cloudinary?.apiKey ?? '')
                .onChange(async (value) => {
                    await this.updateCloudinarySettings({
                            apiKey: value
                    });
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.apiSecret'))
            .setDesc(getTranslation('settings.apiSecretDesc'))
            .addText(text => text
                .setPlaceholder('abcdefghijklmnopqrstuvwxyz123456')
                .setValue(this.plugin.settings.cloudinary?.apiSecret ?? '')
                .onChange(async (value) => {
                    await this.updateCloudinarySettings({
                            apiSecret: value
                    });
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.cloudinary.uploadPreset'))
            .setDesc(getTranslation('settings.cloudinary.uploadPresetDesc'))
            .addText(text => text
                .setPlaceholder('my-preset')
                .setValue(this.plugin.settings.cloudinary?.uploadPreset ?? '')
                .onChange(async (value) => {
                    await this.updateCloudinarySettings({
                            uploadPreset: value || undefined
                    });
                }));
    }

    private displayTwicPicsSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: getTranslation('settings.twicpics.title') });
        
        const description = containerEl.createEl('p', { 
            cls: 'setting-item-description'
        });
        description.innerHTML = `
            ${getTranslation('settings.twicpics.description')}
            <br><br>
            ${getTranslation('settings.twicpics.description.features')}
            <ul>
                <li>Uploader l'image vers votre compte TwicPics</li>
                <li>Insérer le lien de l'image optimisée dans votre note</li>
                <li>Appliquer automatiquement les transformations configurées</li>
            </ul>
            <br>
            ${getTranslation('settings.twicpics.description.realtime')}
            <br><br>
            ${getTranslation('settings.twicpics.setup.title')}
            <ul>
                <li>${getTranslation('settings.twicpics.setup.step1')}</li>
                <li>${getTranslation('settings.twicpics.setup.step2')}</li>
                <li>${getTranslation('settings.twicpics.setup.step3')}</li>
            </ul>
        `;

        new Setting(containerEl)
            .setName(getTranslation('settings.twicpics.domain'))
            .setDesc(getTranslation('settings.twicpics.domainDesc'))
            .addText(text => text
                .setPlaceholder('your-workspace.twicpics.com')
                .setValue(this.plugin.settings.twicpics?.domain ?? '')
                .onChange(async (value) => {
                    await this.updateTwicPicsSettings({
                        domain: value
                    });
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.twicpics.apiKey'))
            .setDesc(getTranslation('settings.twicpics.apiKeyDesc'))
            .addText(text => text
                .setPlaceholder('your-api-key')
                .setValue(this.plugin.settings.twicpics?.apiKey ?? '')
                .onChange(async (value) => {
                    await this.updateTwicPicsSettings({
                        apiKey: value
                    });
                }));

        new Setting(containerEl)
            .setName(getTranslation('settings.twicpics.path'))
            .setDesc(getTranslation('settings.twicpics.pathDesc'))
            .addText(text => text
                .setPlaceholder('/obsidian')
                .setValue(this.plugin.settings.twicpics?.path ?? '')
                .onChange(async (value) => {
                    await this.updateTwicPicsSettings({
                        path: value
                    });
                }));
    }

    private displayCloudflareSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: getTranslation('settings.cloudflare.title') });
        
        const description = containerEl.createEl('p', { 
            cls: 'setting-item-description'
        });
        description.innerHTML = `
            ${getTranslation('settings.cloudflare.description')}
            <br><br>
            ${getTranslation('settings.cloudflare.description.features')}
            <ul>
                <li>Uploader l'image vers votre compte Cloudflare</li>
                <li>Insérer le lien de l'image optimisée dans votre note</li>
                <li>Servir l'image via le CDN de Cloudflare</li>
            </ul>
            <br>
            ${getTranslation('settings.cloudflare.description.protection')}
            <br><br>
            ${getTranslation('settings.cloudflare.description.organization')}
            <ul>
                <li>Utilisez des variants différents (ex: obsidian/blog, obsidian/docs)</li>
                <li>Ou configurez des domaines personnalisés différents par projet</li>
            </ul>
            <br>
            ${getTranslation('settings.cloudflare.description.r2')}
            <ul>
                <li>Utiliser le dashboard Cloudflare (interface basique)</li>
                <li>Utiliser des outils compatibles S3 (comme Cyberduck, S3 Browser)</li>
                <li>Accéder via l'API R2 ou S3</li>
            </ul>
            <br>
            ${getTranslation('settings.cloudflare.setup.title')}
            <ul>
                <li>${getTranslation('settings.cloudflare.setup.step1')}</li>
                <li>${getTranslation('settings.cloudflare.setup.step2')}</li>
                <li>${getTranslation('settings.cloudflare.setup.step3')}</li>
                <li>${getTranslation('settings.cloudflare.setup.step4')}</li>
            </ul>
        `;

        // Account ID
        new Setting(containerEl)
            .setName(getTranslation('settings.cloudflare.accountId'))
            .setDesc(getTranslation('settings.cloudflare.accountIdDesc'))
            .addText(text => text
                .setPlaceholder('Ex: 1a2b3c4d5e6f7g8h9i0j')
                .setValue(this.plugin.settings.cloudflare?.accountId ?? '')
                .onChange(async (value) => {
                    await this.updateCloudflareSettings({
                        accountId: value
                    });
                }));

        // Hash de livraison
        new Setting(containerEl)
            .setName(getTranslation('settings.cloudflare.deliveryHash'))
            .setDesc(getTranslation('settings.cloudflare.deliveryHashDesc'))
            .addText(text => text
                .setPlaceholder('Ex: abcdef123456')
                .setValue(this.plugin.settings.cloudflare?.deliveryHash ?? '')
                .onChange(async (value) => {
                    await this.updateCloudflareSettings({
                        deliveryHash: value
                    });
                }));

        // API Token
        new Setting(containerEl)
            .setName(getTranslation('settings.cloudflare.token'))
            .setDesc(getTranslation('settings.cloudflare.tokenDesc'))
            .addText(text => text
                .setPlaceholder('Ex: XyZ_123-ABC...')
                .setValue(this.plugin.settings.cloudflare?.imagesToken ?? '')
                .onChange(async (value) => {
                    await this.updateCloudflareSettings({
                        imagesToken: value
                    });
                }));
    }

    private displayBunnySettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: getTranslation('settings.bunny.title') });
        
        const description = containerEl.createEl('p', { 
            cls: 'setting-item-description'
        });
        description.innerHTML = `
            ${getTranslation('settings.bunny.description')}
            <br><br>
            ${getTranslation('settings.bunny.description.features')}
            <ul>
                <li>Uploader l'image vers votre zone de stockage Bunny.net</li>
                <li>Insérer le lien de l'image optimisée dans votre note</li>
                <li>Servir l'image via le CDN Bunny.net</li>
            </ul>
            <br>
            ${getTranslation('settings.bunny.description.cdn')}
            <br><br>
            ${getTranslation('settings.bunny.description.advantages')}
            <ul>
                <li>Stockage flexible avec les Storage Zones</li>
                <li>CDN performant avec les Pull Zones</li>
                <li>Possibilité d'utiliser des domaines personnalisés</li>
                <li>Tarification simple et transparente</li>
            </ul>
            <br>
            ${getTranslation('settings.bunny.setup.title')}
            <ul>
                <li>${getTranslation('settings.bunny.setup.step1')}</li>
                <li>${getTranslation('settings.bunny.setup.step2')}</li>
                <li>${getTranslation('settings.bunny.setup.step3')}</li>
                <li>${getTranslation('settings.bunny.setup.step4')}</li>
            </ul>
            <br>
            ${getTranslation('settings.bunny.setup.note')}
        `;

        // Section des zones de stockage
        const storageZonesSection = containerEl.createDiv('mediaflowz-storage-zones-section');
        // Liste des zones de stockage actuelles
        const storageZones = this.plugin.settings.bunny?.storageZones || [];
        storageZones.forEach((zone, index) => {
            const zoneEl = storageZonesSection.createDiv('mediaflowz-storage-zone-item');
            
            new Setting(zoneEl)
                .setName(zone.name)
                .setDesc(zone.customCDN 
                    ? `${zone.pullZoneUrl} (CDN personnalisé: ${zone.customCDN})`
                    : zone.pullZoneUrl)
                .addExtraButton(button => button
                    .setIcon('trash')
                    .setTooltip(getTranslation('settings.bunny.removeZone'))
                    .onClick(async () => {
                        const newZones = [...storageZones];
                        newZones.splice(index, 1);
                        await this.updateBunnySettings({
                            storageZones: newZones,
                            defaultStorageZone: this.plugin.settings.bunny?.defaultStorageZone === zone.name 
                                ? (newZones[0]?.name || '') 
                                : this.plugin.settings.bunny?.defaultStorageZone
                        });
                        this.display();
                    }));

            // Afficher les dossiers associés à cette zone
            if (zone.folders && zone.folders.length > 0) {
                const foldersEl = zoneEl.createDiv('mediaflowz-storage-zone-folders');
                zone.folders.forEach(folder => {
                    new Setting(foldersEl)
                        .setName(folder)
                        .addExtraButton(button => button
                            .onClick(async () => {
                                const updatedZone = {
                                    ...zone,
                                    folders: zone.folders?.filter(f => f !== folder)
                                };
                                const newZones = storageZones.map(z => 
                                    z.name === zone.name ? updatedZone : z
                                );
                                await this.updateBunnySettings({
                                    storageZones: newZones
                                });
                                this.display();
                            }));
                });
            }
        });

        // Bouton pour ajouter une nouvelle zone de stockage
        new Setting(storageZonesSection)
            .setName(getTranslation('settings.bunny.addStorageZone'))
            .addButton(button => {
                button
                    .setButtonText('+')
                    .onClick((e: MouseEvent) => {
                        const menu = new Menu();
                        this.buildFolderMenu(menu, this.app.vault.getRoot(), (folder: TFolder) => {
                            const modal = new Modal(this.app);
                            modal.titleEl.setText(getTranslation('settings.bunny.addStorageZone'));
                            modal.containerEl.addClass('mediaflowz-bunny-storage-modal');

                            const nameContainer = modal.contentEl.createDiv('mediaflowz-setting-item');
                            nameContainer.createDiv('mediaflowz-setting-item-info')
                                .setText(getTranslation('settings.bunny.zoneName'));
                            const nameInput = new TextComponent(nameContainer)
                                .setPlaceholder(getTranslation('settings.bunny.zoneNameDesc'));

                            const accessKeyContainer = modal.contentEl.createDiv('mediaflowz-setting-item');
                            accessKeyContainer.createDiv('mediaflowz-setting-item-info')
                                .setText(getTranslation('settings.bunny.accessKey'));
                            const accessKeyInput = new TextComponent(accessKeyContainer)
                                .setPlaceholder(getTranslation('settings.bunny.accessKeyDesc'));

                            const pullZoneContainer = modal.contentEl.createDiv('mediaflowz-setting-item');
                            pullZoneContainer.createDiv('mediaflowz-setting-item-info')
                                .setText(getTranslation('settings.bunny.pullZoneUrl'));
                            const pullZoneInput = new TextComponent(pullZoneContainer)
                                .setPlaceholder(getTranslation('settings.bunny.pullZoneUrlDesc'));

                            const customCdnContainer = modal.contentEl.createDiv('mediaflowz-setting-item');
                            customCdnContainer.createDiv('mediaflowz-setting-item-info')
                                .setText(getTranslation('settings.bunny.customCDN'));
                            const customCdnInput = new TextComponent(customCdnContainer)
                                .setPlaceholder(getTranslation('settings.bunny.customCDNDesc'));

                            const buttonContainer = modal.contentEl.createDiv('mediaflowz-setting-item');
                            buttonContainer.style.textAlign = 'right';
                            new ButtonComponent(buttonContainer)
                                .setButtonText(getTranslation('settings.bunny.addZone'))
                                .setCta()
                                .onClick(async () => {
                                    const name = nameInput.getValue();
                                    const accessKey = accessKeyInput.getValue();
                                    const pullZoneUrl = pullZoneInput.getValue();
                                    const customCdn = customCdnInput.getValue();
                                    
                                    if (name && accessKey && pullZoneUrl) {
                                        const newZone = {
                                            name,
                                            accessKey,
                                            pullZoneUrl,
                                            folders: [folder.path],
                                            customCDN: customCdn || undefined
                                        };
                                        
                                        const newZones = [...(this.plugin.settings.bunny?.storageZones || []), newZone];
                                        await this.updateBunnySettings({
                                            storageZones: newZones,
                                            defaultStorageZone: newZones.length === 1 ? name : this.plugin.settings.bunny?.defaultStorageZone
                                        });
                                        modal.close();
                                        this.display();
                                    }
                                });

                            modal.open();
                        });
                        menu.showAtMouseEvent(e);
                    });
            });
    }

    private buildFolderMenu(menu: Menu, folder: TFolder, onFolderSelect: (folder: TFolder) => void, level: number = 0) {
        // Ajouter l'option "Vault" au niveau racine seulement
        if (level === 0) {
            menu.addItem(item => {
                item.setTitle(getTranslation('settings.bunny.vault'))
                    .setIcon('vault')
                    .onClick(() => onFolderSelect(this.app.vault.getRoot()));
            });

            // Ajouter un séparateur
            menu.addSeparator();
        }

        const subFolders = folder.children.filter((child): child is TFolder => child instanceof TFolder);
        
        subFolders.forEach(subFolder => {
            const hasChildren = subFolder.children.some(child => child instanceof TFolder);
            
            if (hasChildren) {
                menu.addItem(item => {
                    const titleEl = createSpan({ cls: 'mediaflowz-menu-item-title' });
                    titleEl.appendText(subFolder.name);
                    titleEl.appendChild(createSpan({ cls: 'mediaflowz-menu-item-arrow', text: ' →' }));

                    (item as any).dom.querySelector('.menu-item-title')?.replaceWith(titleEl);
                    item.setIcon('folder');

                    const subMenu = new Menu();
                    this.buildFolderMenu(subMenu, subFolder, onFolderSelect, level + 1);

                    const itemDom = (item as any).dom as HTMLElement;
                    if (itemDom) {
                        let isOverItem = false;
                        let isOverMenu = false;
                        let hideTimeout: NodeJS.Timeout;

                        const showSubMenu = () => {
                            const rect = itemDom.getBoundingClientRect();
                            subMenu.showAtPosition({
                                x: rect.right,
                                y: rect.top
                            });
                        };

                        const hideSubMenu = () => {
                            hideTimeout = setTimeout(() => {
                                if (!isOverItem && !isOverMenu) {
                                    subMenu.hide();
                                }
                            }, 100);
                        };

                        itemDom.addEventListener('mouseenter', () => {
                            isOverItem = true;
                            if (hideTimeout) clearTimeout(hideTimeout);
                            showSubMenu();
                        });

                        itemDom.addEventListener('mouseleave', () => {
                            isOverItem = false;
                            hideSubMenu();
                        });

                        const subMenuEl = (subMenu as any).dom;
                        if (subMenuEl) {
                            subMenuEl.addEventListener('mouseenter', () => {
                                isOverMenu = true;
                                if (hideTimeout) clearTimeout(hideTimeout);
                            });

                            subMenuEl.addEventListener('mouseleave', () => {
                                isOverMenu = false;
                                hideSubMenu();
                            });
                    }

                    item.onClick(() => onFolderSelect(subFolder));
                    }
                });
            } else {
                menu.addItem(item => {
                    item.setTitle(subFolder.name)
                        .setIcon('folder')
                        .onClick(() => onFolderSelect(subFolder));
                });
            }
        });
    }

    // Récupérer tous les dossiers du vault de manière hiérarchique
    private getAllFolders(): { [key: string]: TFolder } {
        const folderMap: { [key: string]: TFolder } = {};
        const vault = this.app.vault;
        
        // Fonction récursive pour parcourir les dossiers
        const traverse = (folder: TFolder) => {
            const path = folder.path;
            if (path !== '/') {
                folderMap[path] = folder;
            }
            
            folder.children
                .filter((child): child is TFolder => child instanceof TFolder)
                .forEach(traverse);
        };

        // Commencer la traversée depuis la racine
        traverse(vault.getRoot());
        return folderMap;
    }

    private displayToolbarSettings(containerEl: HTMLElement): void {
        const toolbarSection = containerEl.createDiv('mediaflowz-toolbar-buttons-section');
        toolbarSection.createEl('h3', { text: getTranslation('settings.features.imageToolbar.name') });
        toolbarSection.createEl('p', { 
            text: getTranslation('settings.toolbar.desc'),
            cls: 'mediaflowz-setting-item-description'
        });

        // Copier l'image
        new Setting(toolbarSection)
            .setName(getTranslation('settings.toolbar.copyImage'))
            .setDesc(getTranslation('settings.toolbar.copyImage.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.toolbarButtons.copyImage)
                .onChange(async (value) => {
                    this.plugin.settings.toolbarButtons.copyImage = value;
                    await this.plugin.saveSettings();
                })
            );

        // Copier le lien
        new Setting(toolbarSection)
            .setName(getTranslation('settings.toolbar.copyLink'))
            .setDesc(getTranslation('settings.toolbar.copyLink.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.toolbarButtons.copyLink)
                .onChange(async (value) => {
                    this.plugin.settings.toolbarButtons.copyLink = value;
                    await this.plugin.saveSettings();
                })
            );

        // Plein écran
        new Setting(toolbarSection)
            .setName(getTranslation('settings.toolbar.fullscreen'))
            .setDesc(getTranslation('settings.toolbar.fullscreen.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.toolbarButtons.fullscreen)
                .onChange(async (value) => {
                    this.plugin.settings.toolbarButtons.fullscreen = value;
                    await this.plugin.saveSettings();
                })
            );

        // Ouvrir dans l'application par défaut
        new Setting(toolbarSection)
            .setName(getTranslation('settings.toolbar.openInDefaultApp'))
            .setDesc(getTranslation('settings.toolbar.openInDefaultApp.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.toolbarButtons.openInDefaultApp)
                .onChange(async (value) => {
                    this.plugin.settings.toolbarButtons.openInDefaultApp = value;
                    await this.plugin.saveSettings();
                })
            );

        // Afficher dans l'explorateur
        new Setting(toolbarSection)
            .setName(getTranslation('settings.toolbar.showInExplorer'))
            .setDesc(getTranslation('settings.toolbar.showInExplorer.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.toolbarButtons.showInExplorer)
                .onChange(async (value) => {
                    this.plugin.settings.toolbarButtons.showInExplorer = value;
                    await this.plugin.saveSettings();
                })
            );

        // Révéler dans la navigation
        new Setting(toolbarSection)
            .setName(getTranslation('settings.toolbar.revealInNavigation'))
            .setDesc(getTranslation('settings.toolbar.revealInNavigation.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.toolbarButtons.revealInNavigation)
                .onChange(async (value) => {
                    this.plugin.settings.toolbarButtons.revealInNavigation = value;
                    await this.plugin.saveSettings();
                })
            );

        // Renommer l'image
        new Setting(toolbarSection)
            .setName(getTranslation('settings.toolbar.renameImage'))
            .setDesc(getTranslation('settings.toolbar.renameImage.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.toolbarButtons.renameImage)
                .onChange(async (value) => {
                    this.plugin.settings.toolbarButtons.renameImage = value;
                    await this.plugin.saveSettings();
                })
            );

        // Ajouter une légende
        new Setting(toolbarSection)
            .setName(getTranslation('settings.toolbar.addCaption'))
            .setDesc(getTranslation('settings.toolbar.addCaption.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.toolbarButtons.addCaption)
                .onChange(async (value) => {
                    this.plugin.settings.toolbarButtons.addCaption = value;
                    await this.plugin.saveSettings();
                })
            );

        // Redimensionnement de l'image
        new Setting(toolbarSection)
            .setName('Redimensionnement de l\'image')
            .setDesc('Permet de redimensionner l\'image avec le slider')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.toolbarButtons.resizeImage)
                .onChange(async (value) => {
                    this.plugin.settings.toolbarButtons.resizeImage = value;
                    await this.plugin.saveSettings();
                })
            );
    }

    private async updateCloudinarySettings(settings: Partial<ICloudinarySettings & { folder: string }>) {
        if (!this.plugin.settings.cloudinary) {
            // Initialiser avec des valeurs par défaut si non défini
            this.plugin.settings.cloudinary = {
                cloudName: '',
                apiKey: '',
                apiSecret: '',
                uploadPreset: '',
                folder: ''
            };
        }

        await this.updateSettings({
            cloudinary: {
                ...this.plugin.settings.cloudinary,
                ...settings
            }
        });
    }

    private async updateTwicPicsSettings(settings: Partial<ITwicPicsSettings>) {
        if (!this.plugin.settings.twicpics) {
            // Initialiser avec des valeurs par défaut si non défini
            this.plugin.settings.twicpics = {
                domain: '',
                apiKey: '',
                path: ''
            };
        }
        
        await this.updateSettings({
            twicpics: {
                ...this.plugin.settings.twicpics,
                ...settings
            }
        });
    }

    private async updateCloudflareSettings(settings: Partial<ICloudflareSettings>) {
        if (!this.plugin.settings.cloudflare) {
            // Initialiser avec des valeurs par défaut si non défini
            this.plugin.settings.cloudflare = {
                accountId: '',
                imagesToken: '',
                deliveryHash: '',
                defaultVariant: '',
                customDomain: ''
            };
        }
        
        await this.updateSettings({
            cloudflare: {
                ...this.plugin.settings.cloudflare,
                ...settings
            }
        });
    }

    private async updateBunnySettings(settings: Partial<IBunnySettings>) {
        if (!this.plugin.settings.bunny) {
            // Initialiser avec des valeurs par défaut si non défini
            this.plugin.settings.bunny = {
                storageZones: [],
                defaultStorageZone: '',
                useFolderMapping: true
            };
        }
        
        await this.updateSettings({
            bunny: {
                ...this.plugin.settings.bunny,
                ...settings
            }
        });
    }

// Auto-upload settings
    private displayAutoUploadSettings(containerEl: HTMLElement): void {
        const autoUploadSection = containerEl.createDiv('mediaflowz-auto-upload-section');
        
        // Section de sélection du service
        const serviceSection = autoUploadSection.createDiv('mediaflowz-service-section');
        
        new Setting(serviceSection)
            .setName(getTranslation('settings.service'))
            .setDesc(getTranslation('settings.serviceDesc'))
            .addDropdown(dropdown => {
                // Ajouter une option vide
                dropdown.addOption('', getTranslation('settings.selectService'));
                
                // Ajouter les services supportés depuis l'enum
                Object.values(SupportedService).forEach(service => {
                    dropdown.addOption(service, service.charAt(0).toUpperCase() + service.slice(1));
                });
                
                // Définir la valeur actuelle
                dropdown.setValue(this.plugin.settings.service);
                
                // Gérer le changement
                dropdown.onChange(async (value) => {
                    const settingsSection = autoUploadSection.querySelector('.mediaflowz-service-settings-section');
                    if (settingsSection) {
                        settingsSection.addClass('fade-out');
                    }

                    try {
                        // Réinitialiser tous les services
                        const newSettings: Partial<typeof this.plugin.settings> = {
                            service: value as SupportedService | '',
                            cloudinary: undefined,
                            twicpics: undefined,
                            cloudflare: undefined,
                            bunny: undefined
                        };

                        // Mettre à jour les paramètres
                        await this.updateSettings(newSettings);
                        
                        // Recharger l'interface
                        this.display();

                        if (value) {
                            // Notification
                            showNotice(
                                getTranslation('notices.serviceChanged')
                                    .replace('{service}', value.charAt(0).toUpperCase() + value.slice(1)),
                                NOTICE_DURATIONS.MEDIUM
                            );
                        }

                    } catch (error) {
                        showNotice(
                            error instanceof Error ? error.message : getTranslation('errors.unexpectedError'),
                            NOTICE_DURATIONS.LONG
                        );
                    }
                });
            });

        // Section des paramètres spécifiques au service
        if (this.plugin.settings.service) {
            const serviceSettingsSection = autoUploadSection.createDiv('mediaflowz-service-settings-section');

            // Afficher les paramètres selon le service sélectionné
            switch (this.plugin.settings.service) {
                case SupportedService.CLOUDINARY:
                    this.displayCloudinarySettings(serviceSettingsSection);
                    break;
                case SupportedService.TWICPICS:
                    this.displayTwicPicsSettings(serviceSettingsSection);
                    break;
                case SupportedService.CLOUDFLARE:
                    this.displayCloudflareSettings(serviceSettingsSection);
                    break;
                case SupportedService.BUNNY:
                    this.displayBunnySettings(serviceSettingsSection);
                    break;
            }
        }

        // Option pour conserver une copie locale
        new Setting(autoUploadSection)
            .setName(getTranslation('settings.features.autoupload.keepLocalCopy'))
            .setDesc(getTranslation('settings.features.autoupload.keepLocalCopy.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.features.keepLocalCopy)
                .onChange(async (value) => {
                    await this.updateSettings({
                        features: {
                            ...this.plugin.settings.features,
                            keepLocalCopy: value
                        }
                    });
                })
            );

        // Option pour le dossier de destination
        new Setting(autoUploadSection)
            .setName(getTranslation('settings.features.autoupload.uploadFolder'))
            .setDesc(getTranslation('settings.features.autoupload.uploadFolder.desc'))
            .addText(text => text
                .setPlaceholder(getTranslation('settings.features.autoupload.uploadFolder.placeholder'))
                .setValue(this.plugin.settings.features.uploadFolder)
                .onChange(async (value) => {
                    await this.updateSettings({
                        features: {
                            ...this.plugin.settings.features,
                            uploadFolder: value
                        }
                    });
                }));

        // Section des types de médias
        const mediaTypesSection = autoUploadSection.createDiv('mediaflowz-media-types-section');
        mediaTypesSection.createEl('h2', { text: getTranslation('settings.mediaTypes.title') });
        mediaTypesSection.createEl('p', { 
            text: getTranslation('settings.mediaTypes.desc'),
            cls: 'mediaflowz-setting-item-description'
        });

        // Images
        if (this.plugin.settings?.enabledMediaTypes) {
            new Setting(mediaTypesSection)
                .setName(getTranslation('settings.mediaTypes.images'))
                .setDesc(getTranslation('settings.mediaTypes.images.desc'))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.enabledMediaTypes.images)
                    .onChange(async (value) => {
                        if (this.plugin.settings?.enabledMediaTypes) {
                            this.plugin.settings.enabledMediaTypes.images = value;
                            await this.plugin.saveSettings();
                        }
                    })
                );

            // Vidéos
            new Setting(mediaTypesSection)
                .setName(getTranslation('settings.mediaTypes.videos'))
                .setDesc(getTranslation('settings.mediaTypes.videos.desc'))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.enabledMediaTypes.videos)
                    .onChange(async (value) => {
                        if (this.plugin.settings?.enabledMediaTypes) {
                            this.plugin.settings.enabledMediaTypes.videos = value;
                            await this.plugin.saveSettings();
                        }
                    })
                );

                // GIFs
                new Setting(mediaTypesSection)
                    .setName(getTranslation('settings.mediaTypes.gifs'))
                    .setDesc(getTranslation('settings.mediaTypes.gifs.desc'))
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.enabledMediaTypes.gifs)
                        .onChange(async (value) => {
                            if (this.plugin.settings?.enabledMediaTypes) {
                                this.plugin.settings.enabledMediaTypes.gifs = value;
                                await this.plugin.saveSettings();
                            }
                        })
                    );
        }

        // Section des dossiers ignorés
        const ignoredFoldersSection = mediaTypesSection.createDiv('mediaflowz-ignored-folders-section');
        ignoredFoldersSection.createEl('h3', { text: getTranslation('settings.ignoredFolders.title') });
        const ignoredFoldersList = ignoredFoldersSection.createEl('div', { cls: 'mediaflowz-ignored-folders-list' });

        if (this.plugin.settings?.ignoredFolders) {
            this.plugin.settings.ignoredFolders.forEach((folder: string, index: number) => {
                const folderDiv = ignoredFoldersList.createEl('div', { cls: 'mediaflowz-ignored-folder-item' });
                
                new Setting(folderDiv)
                    .setName(folder)
                    .addButton(button => button
                        .setIcon('trash')
                        .setTooltip(getTranslation('settings.ignoredFolders.remove'))
                        .onClick(async () => {
                            if (this.plugin.settings?.ignoredFolders) {
                                const newIgnoredFolders = [...this.plugin.settings.ignoredFolders];
                                newIgnoredFolders.splice(index, 1);
                                await this.updateSettings({
                                    ignoredFolders: newIgnoredFolders
                                });
                                this.display();
                            }
                        }));
            });
        }

        // Bouton pour ajouter un nouveau dossier à ignorer
        new Setting(ignoredFoldersSection)
            .setName(getTranslation('settings.ignoredFolders.add'))
            .setDesc(getTranslation('settings.ignoredFolders.addDesc'))
            .addButton(button => button
                .setButtonText(getTranslation('settings.ignoredFolders.select'))
                .onClick((e: MouseEvent) => {
                    const menu = new Menu();
                    
                    if (this.app?.vault) {
                        this.buildFolderMenu(menu, this.app.vault.getRoot(), async (folder: TFolder) => {
                            if (this.plugin.settings?.ignoredFolders && !this.plugin.settings.ignoredFolders.includes(folder.path)) {
                                const newIgnoredFolders = [...this.plugin.settings.ignoredFolders, folder.path];
                                await this.updateSettings({
                                    ignoredFolders: newIgnoredFolders
                                });
                                this.display();
                            }
                        });
                    }

                    menu.showAtMouseEvent(e);
                }));

        // Option pour créer un dossier par note
        if (this.plugin.settings?.ignoredFoldersSettings) {
            new Setting(ignoredFoldersSection)
                .setName(getTranslation('settings.ignoredFolders.useNoteFolders'))
                .setDesc(getTranslation('settings.ignoredFolders.useNoteFolders.desc'))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.ignoredFoldersSettings.useNoteFolders)
                    .onChange(async (value) => {
                        if (this.plugin.settings?.ignoredFoldersSettings) {
                            this.plugin.settings.ignoredFoldersSettings.useNoteFolders = value;
                            await this.plugin.saveSettings();
                        }
                    })
                );
        }
    }
} 