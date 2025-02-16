import { moment } from 'obsidian';

type TranslationKey = keyof typeof fr;
type TranslationsType = Record<'fr' | 'en', Record<TranslationKey, string>>;

export class Translations {
    private translations: TranslationsType;

    constructor() {
        this.translations = {
            fr,
            en
        };
    }

    t(key: TranslationKey): string {
        const lang = moment.locale() === 'fr' ? 'fr' : 'en';
        return this.translations[lang][key];
    }
}


export function getCurrentLocale(): 'fr' | 'en' {
    const locale = moment.locale() || 'en';
    return locale === 'fr' ? 'fr' : 'en';
}

export function getTranslation(key: TranslationKey): string {
    const currentLocale = getCurrentLocale();
    const lang = translations[currentLocale] ? currentLocale : 'en';
    
    if (!translations[lang][key]) {
        console.warn(`Missing translation for key: ${key} in language: ${lang}`);
        return key;
    }
    
    return translations[lang][key];
}

const fr = {
    // Dashboard
    'dashboard.title': 'MediaFlowz',
    'dashboard.viewModeTab': 'Onglet',
    'dashboard.viewModeSidebar': 'Barre latérale',
    'dashboard.viewModePopup': 'Popup',

    // Paramètres généraux
    'settings.title': 'Paramètres MediaFlowz',
    'settings.service': 'Service d\'upload pour les médias',
    'settings.service.title': 'Configuration du service',
    'settings.serviceDesc': 'Choisissez le service que vous souhaitez utiliser pour héberger vos médias.',
    'settings.selectService': 'Sélectionnez un service...',

    // Paramètres communs
    'settings.apiKey': 'Clé API',
    'settings.apiKeyDesc': 'Votre clé API',
    'settings.apiSecret': 'Secret API',
    'settings.apiSecretDesc': 'Votre secret API',

    // Paramètres Cloudinary
    'settings.cloudinary.title': 'Configuration Cloudinary',
    'settings.cloudinary.description': 'Cloudinary est un service de gestion de médias qui offre des fonctionnalités avancées de transformation d\'images et de vidéos.',
    'settings.cloudinary.description.features': 'Lorsque vous collez une image depuis le presse-papier dans votre note Obsidian, le plugin va :',
    'settings.cloudinary.description.features.list': '• Uploader l\'image vers votre compte Cloudinary\n' +
        '• Insérer le lien de l\'image optimisée dans votre note\n' +
        '• Appliquer automatiquement les transformations configurées',
    'settings.cloudinary.description.cdn': 'Vos images seront servies via le CDN mondial de Cloudinary pour des performances optimales.',
    'settings.cloudinary.setup.title': 'Pour configurer Cloudinary :',
    'settings.cloudinary.setup.step1': 'Créez un compte sur <a href="https://cloudinary.com">cloudinary.com</a>',
    'settings.cloudinary.setup.step2': 'Accédez à votre Dashboard',
    'settings.cloudinary.setup.step3': 'Récupérez vos identifiants dans l\'onglet "Account Details"',
    'settings.cloudinary.cloudName': 'Nom du cloud',
    'settings.cloudinary.cloudNameDesc': 'Le nom de votre cloud Cloudinary (ex: my-cloud)',
    'settings.cloudinary.uploadPreset': 'Preset d\'upload',
    'settings.cloudinary.uploadPresetDesc': 'Preset d\'upload non signé (optionnel). Permet d\'éviter d\'utiliser le secret API.',

    // Paramètres TwicPics
    'settings.twicpics.title': 'Configuration TwicPics',
    'settings.twicpics.description': 'TwicPics est une solution d\'optimisation d\'images en temps réel.',
    'settings.twicpics.description.features': 'Lorsque vous collez une image depuis le presse-papier dans votre note Obsidian, le plugin va :',
    'settings.twicpics.description.features.list': '• Uploader l\'image vers votre compte TwicPics\n' +
        '• Insérer le lien de l\'image optimisée dans votre note\n' +
        '• Appliquer automatiquement les transformations configurées',
    'settings.twicpics.description.realtime': 'TwicPics optimise et sert vos images en temps réel selon le contexte de visualisation.',
    'settings.twicpics.setup.title': 'Pour configurer TwicPics :',
    'settings.twicpics.setup.step1': 'Créez un compte sur <a href="https://twicpics.com">twicpics.com</a>',
    'settings.twicpics.setup.step2': 'Créez un nouveau workspace',
    'settings.twicpics.setup.step3': 'Configurez votre domaine et récupérez votre clé API',
    'settings.twicpics.domain': 'Domaine',
    'settings.twicpics.domainDesc': 'Votre domaine TwicPics (ex: your-workspace.twicpics.com)',
    'settings.twicpics.path': 'Chemin',
    'settings.twicpics.pathDesc': 'Chemin de base pour vos médias (ex: /obsidian)',
    'settings.twicpics.apiKey': 'Clé API TwicPics',
    'settings.twicpics.apiKeyDesc': 'Votre clé API TwicPics (trouvable dans les paramètres de votre compte)',

    // Paramètres Cloudflare
    'settings.cloudflare.title': 'Configuration Cloudflare',
    'settings.cloudflare.description': 'Cloudflare Images et Stream permettent de stocker et servir vos médias via le réseau CDN mondial de Cloudflare.',
    'settings.cloudflare.description.features': 'Lorsque vous collez une image depuis le presse-papier dans votre note Obsidian, le plugin va :',
    'settings.cloudflare.description.features.list': '• Uploader l\'image vers votre compte Cloudflare\n' +
        '• Insérer le lien de l\'image optimisée dans votre note\n' +
        '• Servir l\'image via le CDN de Cloudflare',
    'settings.cloudflare.description.protection': 'Vos images sont automatiquement optimisées et protégées par le réseau Cloudflare.',
    'settings.cloudflare.description.organization': 'Note : Cloudflare Images n\'utilise pas de buckets comme S3. Pour organiser vos images par projet :',
    'settings.cloudflare.description.organization.list': '• Utilisez des variants différents (ex: obsidian/blog, obsidian/docs)\n' +
        '• Ou configurez des domaines personnalisés différents par projet',
    'settings.cloudflare.description.r2': 'Note sur R2 : R2 est le service de stockage objet de Cloudflare, compatible S3. Il n\'a pas d\'interface graphique dédiée, mais vous pouvez :',
    'settings.cloudflare.description.r2.list': '• Utiliser le dashboard Cloudflare (interface basique)\n' +
        '• Utiliser des outils compatibles S3 (comme Cyberduck, S3 Browser)\n' +
        '• Accéder via l\'API R2 ou S3',
    'settings.cloudflare.setup.title': 'Pour configurer Cloudflare Images :',
    'settings.cloudflare.setup.step1': 'Connectez-vous à votre compte Cloudflare',
    'settings.cloudflare.setup.step2': 'Activez Cloudflare Images',
    'settings.cloudflare.setup.step3': 'Créez un token API avec les permissions Images',
    'settings.cloudflare.setup.step4': 'Notez votre Account ID et le hash de livraison',
    'settings.cloudflare.accountId': 'Account ID',
    'settings.cloudflare.accountIdDesc': 'Votre identifiant de compte Cloudflare (visible dans l\'URL du dashboard)',
    'settings.cloudflare.deliveryHash': 'Hash de livraison',
    'settings.cloudflare.deliveryHashDesc': 'Le hash utilisé dans les URLs de vos images (format: imagedelivery.net/[hash]/image/variant)',
    'settings.cloudflare.variantPrefix': 'Préfixe des variants',
    'settings.cloudflare.variantPrefixDesc': 'Préfixe ajouté à tous les variants pour ce projet (ex: obsidian/). Permet d\'organiser les images par projet.',
    'settings.cloudflare.defaultVariant': 'Variant par défaut',
    'settings.cloudflare.defaultVariantDesc': 'Le variant Cloudflare à utiliser par défaut (ex: public). Le préfixe sera automatiquement ajouté.',
    'settings.cloudflare.token': 'Token API',
    'settings.cloudflare.tokenDesc': 'Token API avec les permissions Images et Stream',
    'settings.cloudflare.customDomain': 'Domaine personnalisé',
    'settings.cloudflare.customDomainDesc': 'Votre domaine personnalisé pour servir les images (ex: images.votresite.com). Note : Cloudflare Images ne permet qu\'un seul domaine personnalisé par compte.',
    'settings.cloudflare.bucketName': 'R2 Bucket Name',
    'settings.cloudflare.bucketNameDesc': 'Your Cloudflare R2 bucket name.',
    'settings.cloudflare.r2AccessKeyId': 'R2 Access Key',
    'settings.cloudflare.r2AccessKeyIdDesc': 'Your R2 access key identifier.',
    'settings.cloudflare.r2SecretAccessKey': 'R2 Secret',
    'settings.cloudflare.r2SecretAccessKeyDesc': 'Your R2 access key secret.',

    // Notifications
    'notices.success': '✅ Opération réussie',
    'notices.error': '❌ Une erreur est survenue',
    'notices.mediaPasted': '📎 Média détecté...',
    'notices.mediaUploaded': '✅ {fileName} uploadé avec succès',
    'notices.mediaUploadError': '❌ Erreur lors de l\'upload de {fileName}: {error}',
    'notices.mediaInserted': '📝 {fileName} inséré dans la note',
    'notices.settingsSaved': '⚙️ Paramètres sauvegardés',
    'notices.serviceChanged': '🔄 Service changé pour {service}',
    'notices.prefixUpdated': "Le préfixe des images a été mis à jour de '{oldPrefix}' à '{newPrefix}'",
    'notices.noImagesUpdated': "Aucune image à mettre à jour avec le préfixe '{prefix}'",
    'notices.imagesUpdated': "{count} image(s) mise(s) à jour avec le préfixe '{prefix}'",
    'notices.uploadStarted': "⏳ Upload en cours...",
    'notices.uploadProcessing': "🔄 Traitement...",
    'notices.uploadComplete': "✅ {fileName} uploadé et traité avec succès",
    'notices.uploadProgress': '⬛⬛⬛⬜⬜ {step}/5',
    'notices.folderRenamed': '📁 Dossier renommé de "{oldName}" à "{newName}"',

    // Erreurs
    'errors.notConfigured': 'Le service n\'est pas configuré',
    'errors.uploadFailed': 'L\'upload a échoué',
    'errors.networkError': 'Erreur de connexion réseau',
    'errors.checkSettings': 'Vérifiez vos paramètres dans les réglages du plugin',
    'errors.checkConnection': 'Vérifiez votre connexion internet',
    'errors.unexpectedError': 'Une erreur inattendue est survenue',
    'errors.folderRenameError': '❌ Erreur lors du renommage du dossier: {error}',
    'errors.fileCreationError': '❌ Erreur lors de la création du fichier local: {error}',

    // Paramètres des dossiers ignorés
    'settings.ignoredFolders.title': 'Dossiers ignorés',
    'settings.ignoredFolders.add': 'Ajouter un dossier',
    'settings.ignoredFolders.addDesc': 'Les notes dans ces dossiers et leurs sous-dossiers ne seront pas traitées par le plugin. Les images collées dans ces notes seront gérées normalement par Obsidian.',
    'settings.ignoredFolders.select': 'Sélectionner un dossier',
    'settings.ignoredFolders.remove': 'Retirer de la liste',
    'settings.ignoredFolders.noFolders': 'Aucun dossier ignoré',
    'settings.ignoredFolders.selectFolder': 'Sélectionner un dossier',
    'settings.ignoredFolders.folderAdded': 'Dossier ajouté aux dossiers ignorés',
    'settings.ignoredFolders.folderRemoved': 'Dossier retiré des dossiers ignorés',
    'settings.ignoredFolders.useNoteFolders': 'Dossier par note',
    'settings.ignoredFolders.useNoteFolders.desc': 'Pour les notes dans les dossiers ignorés, créer un dossier du même nom que la note pour y stocker les images. Si vous renommez la note, le dossier sera automatiquement renommé et tous les liens d\'images seront mis à jour dans vos notes.',
    'settings.ignoredFolders.useNoteFolders.created': 'Dossier créé pour la note : {noteName}',
    'settings.ignoredFolders.fileCreated': 'Fichier local créé : {fileName}',

    // Features
    'settings.features.title': 'Fonctionnalités',
    'settings.features.imageToolbar.name': 'Barre d\'outils image',
    'settings.features.imageToolbar.desc': 'Affiche une barre d\'outils au survol des images pour accéder rapidement aux actions courantes',
    'settings.features.autoupload.title': 'Auto-upload',
    'settings.features.autoupload.desc': 'Télécharger automatiquement les images collées dans vos notes',
    'settings.features.autoupload.description': 'Configuration de l\'upload automatique vers le cloud',
    'settings.features.autoupload.defaultService': 'Service par défaut',
    'settings.features.autoupload.defaultService.desc': 'Service cloud à utiliser par défaut pour l\'upload automatique',
    'settings.features.autoupload.keepLocalCopy': 'Conserver une copie locale',
    'settings.features.autoupload.keepLocalCopy.desc': 'Garder une copie des images dans le vault même après l\'upload',
    'settings.features.autoupload.uploadFolder': 'Dossier de destination',
    'settings.features.autoupload.uploadFolder.desc': 'Dossier où seront stockées les images uploadées',
    'settings.features.autoupload.uploadFolder.placeholder': 'Ex: images/cloud',

    // Media Types
    'settings.mediaTypes.title': 'Types de médias',
    'settings.mediaTypes.desc': 'Sélectionnez les types de médias à gérer automatiquement',
    'settings.mediaTypes.images': 'Images',
    'settings.mediaTypes.images.desc': 'Activer pour les images (jpg, png, webp)',
    'settings.mediaTypes.videos': 'Vidéos',
    'settings.mediaTypes.videos.desc': 'Activer pour les vidéos (mp4, webm)',
    'settings.mediaTypes.gifs': 'GIFs',
    'settings.mediaTypes.gifs.desc': 'Activer pour les GIFs animés',

    // Image Size
    'settings.imageSize.title': 'Taille des images',
    'settings.imageSize.default': 'Taille par défaut',
    'settings.imageSize.default.desc': 'Taille utilisée lors de l\'insertion d\'une image',
    'settings.imageSize.extraSmall': 'Très petite (160px)',
    'settings.imageSize.small': 'Petite (320px)',
    'settings.imageSize.medium': 'Moyenne (640px)',
    'settings.imageSize.large': 'Grande (1280px)',
    'settings.imageSize.original': 'Originale',
    'settings.imageSize.altScroll': 'Alt + Scroll pour redimensionner',
    'settings.imageSize.altScroll.desc': 'Maintenez Alt et utilisez la molette pour redimensionner les images',

    // Mouse Actions
    'settings.mouseActions.desc': 'Configurez les actions déclenchées par les différents clics de souris',
    'settings.mouseActions.middleClick': 'Clic du milieu de la souris',
    'settings.mouseActions.middleClick.desc': 'Action à effectuer lors d\'un clic avec la molette',
    'settings.mouseActions.middleClick.enable': 'Activer le clic du milieu',
    'settings.mouseActions.rightClick': 'Clic droit de la souris',
    'settings.mouseActions.rightClick.desc': 'Action à effectuer lors d\'un clic droit',
    'settings.mouseActions.rightClick.enable': 'Activer le clic droit',
    'settings.mouseActions.action.none': 'Aucune action',
    'settings.mouseActions.action.desc': 'Choisissez l\'action à effectuer',

    // Toolbar buttons
    'settings.toolbar.title': 'Barre d\'outils',
    'settings.toolbar.desc': 'Configurez les boutons qui apparaissent dans la barre d\'outils des images',
    'settings.toolbar.copyImage': 'Copier l\'image',
    'settings.toolbar.copyImage.desc': 'Copie l\'image dans le presse-papier',
    'settings.toolbar.copyLink': 'Copier le lien',
    'settings.toolbar.copyLink.desc': 'Copie l\'URL de l\'image dans le presse-papier',
    'settings.toolbar.fullscreen': 'Plein écran',
    'settings.toolbar.fullscreen.desc': 'Affiche l\'image en plein écran',
    'settings.toolbar.openInDefaultApp': 'Ouvrir dans l\'application par défaut',
    'settings.toolbar.openInDefaultApp.desc': 'Ouvre l\'image avec l\'application par défaut du système',
    'settings.toolbar.showInExplorer': 'Afficher dans l\'explorateur',
    'settings.toolbar.showInExplorer.desc': 'Ouvre le dossier contenant l\'image',
    'settings.toolbar.revealInNavigation': 'Révéler dans la navigation',
    'settings.toolbar.revealInNavigation.desc': 'Sélectionne l\'image dans la navigation d\'Obsidian',
    'settings.toolbar.renameImage': 'Renommer l\'image',
    'settings.toolbar.renameImage.desc': 'Permet de renommer le fichier image et met à jour tous les liens',
    'settings.toolbar.addCaption': 'Ajouter une légende',
    'settings.toolbar.addCaption.desc': 'Ajoute une légende sous l\'image dans le document',

    // Image Optimization
    'settings.imageOptimization.title': 'Optimisation des images',
    'settings.imageOptimization.desc': 'Configurez comment les images sont optimisées',
    'settings.imageOptimization.mode': 'Mode d\'optimisation',
    'settings.imageOptimization.mode.desc': 'Choisissez entre une optimisation intelligente automatique ou manuelle',
    'settings.imageOptimization.mode.smart': 'Intelligent',
    'settings.imageOptimization.mode.smart.desc': 'Optimise automatiquement en fonction de la qualité d\'origine',
    'settings.imageOptimization.smart.desc': 'Le mode intelligent analyse chaque image et applique la meilleure optimisation possible tout en respectant vos critères',
    'settings.imageOptimization.mode.manual': 'Manuel',
    'settings.imageOptimization.mode.manual.desc': 'Utilise toujours le même niveau de compression',
    
    'settings.imageOptimization.smart.maxSize': 'Taille maximale',
    'settings.imageOptimization.smart.maxSize.desc': 'Taille cible maximale pour les images (en Ko)',
    'settings.imageOptimization.smart.minQuality': 'Qualité minimale',
    'settings.imageOptimization.smart.minQuality.desc': 'Ne compresse jamais en dessous de cette qualité',
    'settings.imageOptimization.smart.targetDPI': 'DPI cible',
    'settings.imageOptimization.smart.targetDPI.desc': 'Résolution cible pour l\'affichage (144 DPI recommandé pour les écrans haute résolution)',
    
    'settings.imageOptimization.manual.quality': 'Qualité de compression',
    'settings.imageOptimization.manual.quality.desc': 'Niveau de qualité fixe (100 = aucune compression)',
    'settings.imageOptimization.manual.info': 'Informations sur le mode manuel',

    // Paramètres Bunny.net
    'settings.bunny.title': 'Configuration Bunny.net',
    'settings.bunny.description': 'Bunny.net est un service CDN qui offre des fonctionnalités de stockage et de diffusion de médias.',
    'settings.bunny.description.features': 'Lorsque vous collez une image depuis le presse-papier dans votre note Obsidian, le plugin va :',
    'settings.bunny.description.features.list': '• Uploader l\'image vers votre zone de stockage Bunny.net\n' +
        '• Insérer le lien de l\'image optimisée dans votre note\n' +
        '• Servir l\'image via le CDN Bunny.net',
    'settings.bunny.description.cdn': 'Vos images sont automatiquement distribuées via le réseau mondial de Bunny.net pour des performances optimales.',
    'settings.bunny.description.advantages': 'Bunny.net offre plusieurs avantages :',
    'settings.bunny.description.advantages.list': '• Stockage flexible avec les Storage Zones\n' +
        '• CDN performant avec les Pull Zones\n' +
        '• Possibilité d\'utiliser des domaines personnalisés\n' +
        '• Tarification simple et transparente',
    'settings.bunny.setup.title': 'Pour configurer Bunny.net :',
    'settings.bunny.setup.step1': 'Créez un compte sur <a href="https://bunny.net">bunny.net</a>',
    'settings.bunny.setup.step2': 'Créez une nouvelle Storage Zone',
    'settings.bunny.setup.step3': 'Configurez une Pull Zone associée',
    'settings.bunny.setup.step4': 'Notez la clé d\'accès FTP/API et l\'URL de la Pull Zone',
    'settings.bunny.setup.note': 'Vous pouvez configurer plusieurs zones de stockage et leur associer des dossiers spécifiques.',
    'settings.bunny.vault': 'Vault entier',
    'settings.bunny.vault.desc': 'Utiliser cette zone pour tout le vault',
    'settings.bunny.storageZones': 'Zones de stockage',
    'settings.bunny.storageZonesDesc': 'Configurez différentes zones de stockage pour vos projets',
    'settings.bunny.addStorageZone': 'Ajouter une zone de stockage',
    'settings.bunny.storageZoneName': 'Nom de la zone',
    'settings.bunny.accessKey': 'Clé d\'accès',
    'settings.bunny.accessKeyDesc': 'La clé d\'accès FTP/API de la zone (trouvable dans FTP & API Access)',
    'settings.bunny.pullZoneUrl': 'PullZone URL',
    'settings.bunny.pullZoneUrlDesc': 'URL du CDN Bunny.net : https://votre-zone.b-cdn.net',
    'settings.bunny.folders': 'Dossiers associés',
    'settings.bunny.foldersDesc': 'Les dossiers Obsidian qui utiliseront cette zone de stockage',
    'settings.bunny.addFolder': 'Ajouter un dossier',
    'settings.bunny.removeFolder': 'Retirer',
    'settings.bunny.setAsDefault': 'Définir comme zone par défaut',
    'settings.bunny.removeZone': 'Supprimer cette zone',
    'settings.bunny.addZone': 'Ajouter',
    'settings.bunny.customCDN': 'CDN personnalisé (optionnel)',
    'settings.bunny.customCDNDesc': 'URL du CDN personnalisé pour ce dossier (ex: https://cdn.votredomaine.com)',
    'settings.bunny.folderPath': 'Chemin du dossier',
    'settings.bunny.cdnUrl': 'URL du CDN',
    'settings.bunny.addCustomCDN': 'Ajouter un CDN personnalisé',
    'settings.bunny.zoneName': 'Zone Name',
    'settings.bunny.zoneNameDesc': 'Bunny storage zone name',
};

const en = {
    // Dashboard
    'dashboard.title': 'MediaFlowz',
    'dashboard.viewModeTab': 'Tab',
    'dashboard.viewModeSidebar': 'Sidebar',
    'dashboard.viewModePopup': 'Popup',

    // General settings
    'settings.title': 'MediaFlowz Settings',
    'settings.service': 'Upload service for media',
    'settings.service.title': 'Service Configuration',
    'settings.serviceDesc': 'Choose the service you want to use to host your media.',
    'settings.selectService': 'Select a service...',

    // Common settings
    'settings.apiKey': 'API Key',
    'settings.apiKeyDesc': 'Your API key',
    'settings.apiSecret': 'API Secret',
    'settings.apiSecretDesc': 'Your API secret',

    // Cloudinary settings
    'settings.cloudinary.title': 'Cloudinary Configuration',
    'settings.cloudinary.description': 'Cloudinary is a media management service offering advanced image and video transformation features.',
    'settings.cloudinary.description.features': 'When you paste an image from the clipboard into your Obsidian note, the plugin will :',
    'settings.cloudinary.description.features.list': '• Upload the image to your Cloudinary account\n' +
        '• Insert the optimized image link into your note\n' +
        '• Apply automatically configured transformations',
    'settings.cloudinary.description.cdn': 'Your images will be served via Cloudinary\'s global CDN for optimal performance.',
    'settings.cloudinary.setup.title': 'For configuring Cloudinary:',
    'settings.cloudinary.setup.step1': 'Create an account on <a href="https://cloudinary.com">cloudinary.com</a>',
    'settings.cloudinary.setup.step2': 'Access your Dashboard',
    'settings.cloudinary.setup.step3': 'Retrieve your credentials from the "Account Details" tab',
    'settings.cloudinary.cloudName': 'Cloud name',
    'settings.cloudinary.cloudNameDesc': 'Your cloud name (e.g. my-cloud)',
    'settings.cloudinary.uploadPreset': 'Upload preset',
    'settings.cloudinary.uploadPresetDesc': 'Unsigned upload preset for better security',

    // TwicPics settings
    'settings.twicpics.title': 'TwicPics Configuration',
    'settings.twicpics.description': 'TwicPics is a real-time image optimization solution.',
    'settings.twicpics.description.features': 'When you paste an image from the clipboard into your Obsidian note, the plugin will :',
    'settings.twicpics.description.features.list': '• Upload the image to your TwicPics account\n' +
        '• Insert the optimized image link into your note\n' +
        '• Apply automatically configured transformations',
    'settings.twicpics.description.realtime': 'TwicPics optimizes and serves your images in real-time based on the viewing context.',
    'settings.twicpics.setup.title': 'For configuring TwicPics:',
    'settings.twicpics.setup.step1': 'Create an account on <a href="https://twicpics.com">twicpics.com</a>',
    'settings.twicpics.setup.step2': 'Create a new workspace',
    'settings.twicpics.setup.step3': 'Configure your domain and retrieve your API key',
    'settings.twicpics.domain': 'Domain',
    'settings.twicpics.domainDesc': 'Your TwicPics domain (e.g. your-workspace.twicpics.com)',
    'settings.twicpics.path': 'Path',
    'settings.twicpics.pathDesc': 'Base path for your media (e.g. /obsidian)',
    'settings.twicpics.apiKey': 'TwicPics API Key',
    'settings.twicpics.apiKeyDesc': 'Your TwicPics API key (found in your account settings)',

    // Cloudflare settings
    'settings.cloudflare.title': 'Cloudflare Configuration',
    'settings.cloudflare.description': 'Cloudflare Images and Stream allow you to store and serve your media through Cloudflare\'s global CDN.',
    'settings.cloudflare.description.features': 'When you paste an image from the clipboard into your Obsidian note, the plugin will :',
    'settings.cloudflare.description.features.list': '• Upload the image to your Cloudflare account\n' +
        '• Insert the optimized image link into your note\n' +
        '• Serve the image via Cloudflare\'s CDN',
    'settings.cloudflare.description.protection': 'Your images are automatically optimized and protected by the Cloudflare network.',
    'settings.cloudflare.description.organization': 'Note: Cloudflare Images does not use buckets like S3. To organize your images by project:',
    'settings.cloudflare.description.organization.list': '• Use different variants (ex: obsidian/blog, obsidian/docs)\n' +
        '• Or configure different custom domains per project',
    'settings.cloudflare.description.r2': 'Note on R2: R2 is Cloudflare\'s object storage service, compatible with S3. It does not have a dedicated graphical interface, but you can :',
    'settings.cloudflare.description.r2.list': '• Use the Cloudflare dashboard (basic interface)\n' +
        '• Use compatible S3 tools (like Cyberduck, S3 Browser)\n' +
        '• Access via R2 or S3 API',
    'settings.cloudflare.setup.title': 'For configuring Cloudflare Images:',
    'settings.cloudflare.setup.step1': 'Log in to your Cloudflare account',
    'settings.cloudflare.setup.step2': 'Enable Cloudflare Images',
    'settings.cloudflare.setup.step3': 'Create an API token with Images permissions',
    'settings.cloudflare.setup.step4': 'Note your Account ID and delivery hash',
    'settings.cloudflare.accountId': 'Account ID',
    'settings.cloudflare.accountIdDesc': 'Your Cloudflare account identifier.',
    'settings.cloudflare.deliveryHash': 'Delivery Hash',
    'settings.cloudflare.deliveryHashDesc': 'The hash used in your image URLs (format: imagedelivery.net/[hash]/image/variant)',
    'settings.cloudflare.variantPrefix': 'Variant Prefix',
    'settings.cloudflare.variantPrefixDesc': 'Prefix added to all variants for this project (e.g. obsidian/). Helps organize images by project.',
    'settings.cloudflare.defaultVariant': 'Default Variant',
    'settings.cloudflare.defaultVariantDesc': 'The Cloudflare variant to use by default (e.g. public). The prefix will be automatically added.',
    'settings.cloudflare.token': 'API Token',
    'settings.cloudflare.tokenDesc': 'Token created in Cloudflare Dashboard: ' +
            'Go to dash.cloudflare.com > Click on the top right menu > ' +
            'My Profile > API Tokens > Create Token > ' +
            'Use the "Cloudflare Images & Stream" template with read and write permissions',
    'settings.cloudflare.customDomain': 'Custom Domain',
    'settings.cloudflare.customDomainDesc': 'Your custom domain to serve images (e.g. images.yoursite.com). Note: Cloudflare Images only allows one custom domain per account.',
    'settings.cloudflare.bucketName': 'R2 Bucket Name',
    'settings.cloudflare.bucketNameDesc': 'Your Cloudflare R2 bucket name.',
    'settings.cloudflare.r2AccessKeyId': 'R2 Access Key',
    'settings.cloudflare.r2AccessKeyIdDesc': 'Your R2 access key identifier.',
    'settings.cloudflare.r2SecretAccessKey': 'R2 Secret',
    'settings.cloudflare.r2SecretAccessKeyDesc': 'Your R2 access key secret.',

    // Notifications
    'notices.success': '✅ Operation successful',
    'notices.error': '❌ An error occurred',
    'notices.mediaPasted': '📎 Media detected...',
    'notices.mediaUploaded': '✅ {fileName} uploaded successfully',
    'notices.mediaUploadError': '❌ Error uploading {fileName}: {error}',
    'notices.mediaInserted': '📝 {fileName} inserted in note',
    'notices.settingsSaved': '⚙️ Settings saved',
    'notices.serviceChanged': '🔄 Service changed to {service}',
    'notices.prefixUpdated': "The image prefix has been updated from '{oldPrefix}' to '{newPrefix}'",
    'notices.noImagesUpdated': "No images to update with the prefix '{prefix}'",
    'notices.imagesUpdated': "{count} image(s) updated with the prefix '{prefix}'",
    'notices.uploadStarted': "⏳ Starting upload...",
    'notices.uploadProcessing': "🔄 Processing...",
    'notices.uploadComplete': "✅ {fileName} uploaded and processed successfully",
    'notices.uploadProgress': '⬛⬛⬛⬜⬜ {step}/5',
    'notices.folderRenamed': '📁 Folder renamed from "{oldName}" to "{newName}"',

    // Errors
    'errors.notConfigured': 'Service is not configured',
    'errors.uploadFailed': 'Upload failed',
    'errors.networkError': 'Network connection error',
    'errors.checkSettings': 'Please check your settings in the plugin configuration',
    'errors.checkConnection': 'Please check your internet connection',
    'errors.unexpectedError': 'An unexpected error occurred',
    'errors.folderRenameError': '❌ Error renaming folder: {error}',
    'errors.fileCreationError': '❌ Error creating local file: {error}',

    // Ignored folders settings
    'settings.ignoredFolders.title': 'Ignored Folders',
    'settings.ignoredFolders.add': 'Add folder',
    'settings.ignoredFolders.addDesc': 'Media in these folders and their subfolders will not be automatically uploaded. Other plugin features (image toolbar, resizing, etc.) will remain active.',
    'settings.ignoredFolders.select': 'Select a folder',
    'settings.ignoredFolders.remove': 'Remove from list',
    'settings.ignoredFolders.noFolders': 'No ignored folders',
    'settings.ignoredFolders.selectFolder': 'Select a folder',
    'settings.ignoredFolders.folderAdded': 'Folder added to ignored folders',
    'settings.ignoredFolders.folderRemoved': 'Folder removed from ignored folders',
    'settings.ignoredFolders.useNoteFolders': 'Note folder',
    'settings.ignoredFolders.useNoteFolders.desc': 'For notes in ignored folders, creates a folder with the same name as the note to store images. If you rename the note, the folder will be automatically renamed and all image links will be updated in your notes.',
    'settings.ignoredFolders.useNoteFolders.created': 'Folder created for note: {noteName}',
    'settings.ignoredFolders.fileCreated': 'Local file created: {fileName}',

    // Features
    'settings.features.title': 'Features',
    'settings.features.imageToolbar.name': 'Image Toolbar',
    'settings.features.imageToolbar.desc': 'Displays a toolbar at the hover of images for quick access to common actions',
    'settings.features.autoupload.title': 'Auto-upload',
    'settings.features.autoupload.desc': 'Automatically upload images to the selected service when pasting from the clipboard',
    'settings.features.autoupload.description': 'Configuration de l\'upload automatique vers le cloud',
    'settings.features.autoupload.defaultService': 'Service par défaut',
    'settings.features.autoupload.defaultService.desc': 'Service cloud à utiliser par défaut pour l\'upload automatique',
    'settings.features.autoupload.keepLocalCopy': 'Conserver une copie locale',
    'settings.features.autoupload.keepLocalCopy.desc': 'Garder une copie des images dans le vault même après l\'upload',
    'settings.features.autoupload.uploadFolder': 'Dossier de destination',
    'settings.features.autoupload.uploadFolder.desc': 'Dossier où seront stockées les images uploadées',
    'settings.features.autoupload.uploadFolder.placeholder': 'Ex: images/cloud',

    // Media Types
    'settings.mediaTypes.title': 'Media Types',
    'settings.mediaTypes.desc': 'Select which media types to handle automatically',
    'settings.mediaTypes.images': 'Images',
    'settings.mediaTypes.images.desc': 'Enable for images (jpg, png, webp)',
    'settings.mediaTypes.videos': 'Videos',
    'settings.mediaTypes.videos.desc': 'Enable for videos (mp4, webm)',
    'settings.mediaTypes.gifs': 'GIFs',
    'settings.mediaTypes.gifs.desc': 'Enable for animated GIFs',

    // Image Size
    'settings.imageSize.title': 'Image Size',
    'settings.imageSize.default': 'Default size',
    'settings.imageSize.default.desc': 'Size used when inserting an image',
    'settings.imageSize.extraSmall': 'Extra Small (160px)',
    'settings.imageSize.small': 'Small (320px)',
    'settings.imageSize.medium': 'Medium (640px)',
    'settings.imageSize.large': 'Large (1280px)',
    'settings.imageSize.original': 'Original',
    'settings.imageSize.altScroll': 'Alt + Scroll to resize',
    'settings.imageSize.altScroll.desc': 'Hold Alt and use the mouse wheel to resize images',

    // Mouse Actions
    'settings.mouseActions.desc': 'Configure actions triggered by different mouse clicks',
    'settings.mouseActions.middleClick': 'Middle mouse click',
    'settings.mouseActions.middleClick.desc': 'Action to perform on middle click',
    'settings.mouseActions.middleClick.enable': 'Enable middle click',
    'settings.mouseActions.rightClick': 'Right mouse click',
    'settings.mouseActions.rightClick.desc': 'Action to perform on right click',
    'settings.mouseActions.rightClick.enable': 'Enable right click',
    'settings.mouseActions.action.none': 'No action',
    'settings.mouseActions.action.desc': 'Choose the action to perform',

    // Toolbar buttons
    'settings.toolbar.title': 'Toolbar',
    'settings.toolbar.desc': 'Configure the buttons that appear in the image toolbar',
    'settings.toolbar.copyImage': 'Copy Image',
    'settings.toolbar.copyImage.desc': 'Copy the image to clipboard',
    'settings.toolbar.copyLink': 'Copy Link',
    'settings.toolbar.copyLink.desc': 'Copy the image URL to clipboard',
    'settings.toolbar.fullscreen': 'Fullscreen',
    'settings.toolbar.fullscreen.desc': 'Display the image in fullscreen',
    'settings.toolbar.openInDefaultApp': 'Open in Default App',
    'settings.toolbar.openInDefaultApp.desc': 'Open the image with system default application',
    'settings.toolbar.showInExplorer': 'Show in System Explorer',
    'settings.toolbar.showInExplorer.desc': 'Open the folder containing the image',
    'settings.toolbar.revealInNavigation': 'Reveal in Navigation',
    'settings.toolbar.revealInNavigation.desc': 'Select the image in Obsidian navigation',
    'settings.toolbar.renameImage': 'Rename Image',
    'settings.toolbar.renameImage.desc': 'Allow renaming the image file and update all links',
    'settings.toolbar.addCaption': 'Add Caption',
    'settings.toolbar.addCaption.desc': 'Add a caption under the image in the document',

    // Image Optimization
    'settings.imageOptimization.title': 'Image Optimization',
    'settings.imageOptimization.desc': 'Configure how images are optimized',
    'settings.imageOptimization.mode': 'Optimization Mode',
    'settings.imageOptimization.mode.desc': 'Choose between automatic intelligent or manual optimization',
    'settings.imageOptimization.mode.smart': 'Smart',
    'settings.imageOptimization.mode.smart.desc': 'Automatically optimizes based on original quality',
    'settings.imageOptimization.smart.desc': 'The smart mode analyzes each image and applies the best possible optimization while respecting your criteria',
    'settings.imageOptimization.mode.manual': 'Manual',
    'settings.imageOptimization.mode.manual.desc': 'Always uses the same compression level',
    
    'settings.imageOptimization.smart.maxSize': 'Maximum Size',
    'settings.imageOptimization.smart.maxSize.desc': 'Target maximum size for images (in KB)',
    'settings.imageOptimization.smart.minQuality': 'Minimum Quality',
    'settings.imageOptimization.smart.minQuality.desc': 'Never compress below this quality level',
    'settings.imageOptimization.smart.targetDPI': 'Target DPI',
    'settings.imageOptimization.smart.targetDPI.desc': 'Target display resolution (144 DPI recommended for high-res screens)',
    
    'settings.imageOptimization.manual.quality': 'Compression Quality',
    'settings.imageOptimization.manual.quality.desc': 'Fixed quality level (100 = no compression)',
    'settings.imageOptimization.manual.info': 'Manual mode information',

    // Bunny.net settings
    'settings.bunny.title': 'Bunny.net Configuration',
    'settings.bunny.description': 'Bunny.net is a CDN service offering storage and media diffusion features.',
    'settings.bunny.description.features': 'When you paste an image from the clipboard into your Obsidian note, the plugin will :',
    'settings.bunny.description.features.list': '• Upload the image to your Bunny.net storage zone\n' +
        '• Insert the optimized image link into your note\n' +
        '• Serve the image via Bunny.net CDN',
    'settings.bunny.description.cdn': 'Your images are automatically distributed via Bunny.net\'s global network for optimal performance.',
    'settings.bunny.description.advantages': 'Bunny.net offers several advantages :',
    'settings.bunny.description.advantages.list': '• Flexible storage with Storage Zones\n' +
        '• Performant CDN with Pull Zones\n' +
        '• Ability to use custom domains\n' +
        '• Simple and transparent pricing',
    'settings.bunny.setup.title': 'For configuring Bunny.net:',
    'settings.bunny.setup.step1': 'Create an account on <a href="https://bunny.net">bunny.net</a>',
    'settings.bunny.setup.step2': 'Create a new Storage Zone',
    'settings.bunny.setup.step3': 'Configure an associated Pull Zone',
    'settings.bunny.setup.step4': 'Note the zone\'s FTP/API access key and Pull Zone URL',
    'settings.bunny.setup.note': 'You can configure multiple storage zones and associate them with specific folders.',
    'settings.bunny.vault': 'Entire Vault',
    'settings.bunny.vault.desc': 'Use this zone for the entire vault',
    'settings.bunny.storageZones': 'Storage Zones',
    'settings.bunny.storageZonesDesc': 'Configure different storage zones for your projects',
    'settings.bunny.addStorageZone': 'Add Storage Zone',
    'settings.bunny.storageZoneName': 'Storage Zone Name',
    'settings.bunny.accessKey': 'Access Key',
    'settings.bunny.accessKeyDesc': 'The zone\'s FTP/API access key (found in FTP & API Access)',
    'settings.bunny.pullZoneUrl': 'PullZoneURL',
    'settings.bunny.pullZoneUrlDesc': 'The associated Pull Zone URL (e.g. https://your-zone.b-cdn.net)',
    'settings.bunny.folders': 'Associated Folders',
    'settings.bunny.foldersDesc': 'Obsidian folders that will use this storage zone',
    'settings.bunny.addFolder': 'Add Folder',
    'settings.bunny.removeFolder': 'Remove',
    'settings.bunny.setAsDefault': 'Set as default zone',
    'settings.bunny.removeZone': 'Remove this zone',
    'settings.bunny.addZone': 'Add',
    'settings.bunny.customCDN': 'Custom CDN (optional)',
    'settings.bunny.customCDNDesc': 'Custom CDN URL for this folder (e.g. https://cdn.yourdomain.com)',
    'settings.bunny.folderPath': 'Folder path',
    'settings.bunny.cdnUrl': 'CDN URL',
    'settings.bunny.addCustomCDN': 'Add custom CDN',
    'settings.bunny.zoneName': 'Zone Name',
    'settings.bunny.zoneNameDesc': 'Bunny storage zone name',
};

const translations: TranslationsType = { fr, en };
