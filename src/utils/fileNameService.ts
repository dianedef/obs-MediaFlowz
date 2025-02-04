import { TFile, Notice, App } from 'obsidian';
import { EventBusService } from '@/services/EventBusService';
import { EventName } from '@/types/events';
import { getTranslation } from '@/core/Translations';

export class FileNameService {
   private static instance: FileNameService;
   private eventBus: EventBusService;
   private app: App;

   private constructor(app: App) {
      this.app = app;
      this.eventBus = EventBusService.getInstance();
      
      // Écouter les changements de frontmatter
      this.eventBus.on(EventName.FRONTMATTER_UPDATED, async ({ file, oldPrefix, newPrefix }) => {
         if (oldPrefix && newPrefix && oldPrefix !== newPrefix) {
            // Trouver toutes les images dans le contenu qui utilisent l'ancien préfixe
            // et les mettre à jour avec le nouveau
            await this.updateImagePrefixes(file, oldPrefix, newPrefix);
         }
      });
   }

   static getInstance(app: App): FileNameService {
      if (!FileNameService.instance) {
         FileNameService.instance = new FileNameService(app);
      }
      return FileNameService.instance;
   }

   public static cleanup(): void {
      if (FileNameService.instance) {
         FileNameService.instance = null as unknown as FileNameService;
      }
   }

   private toKebabCase(str: string): string {
      return str
         .replace(/([a-z])([A-Z])/g, '$1-$2')
         .replace(/[\s_]+/g, '-')
         .replace(/[&]+/g, 'and')
         .replace(/[^a-zA-Z0-9-]/g, '')
         .toLowerCase();
   }

   async getFilePrefix(file: TFile): Promise<string> {
      // Essayer d'abord de récupérer depuis le frontmatter
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;
      
      if (frontmatter?.['img-prefix']) {
         return frontmatter['img-prefix'];
      }

      // Sinon utiliser le titre de la note en kebab-case
      const title = file.basename;
      return this.toKebabCase(title);
   }

   generateFileName(file: File, prefix: string = ''): string {
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || '';
      const baseFileName = this.toKebabCase(prefix || file.name.split('.')[0]);
      const newFileName = `${baseFileName}_${timestamp}.${fileExtension}`;

      console.log('[FileNameService] Génération du nom de fichier:', {
         original: file.name,
         prefix,
         timestamp,
         extension: fileExtension,
         newName: newFileName
      });

      return newFileName;
   }

   createFileWithNewName(file: File, newName: string): File {
      console.log(`[FileNameService] Création d'un nouveau fichier avec le nom ${newName}`, {
         originalName: file.name,
         originalType: file.type,
         originalSize: file.size
      });

      // Créer un nouveau fichier avec le nouveau nom
      const blob = file.slice(0, file.size, file.type);
      const newFile = new File([blob], newName, { type: file.type });

      console.log('[FileNameService] Nouveau fichier créé:', {
         name: newFile.name,
         type: newFile.type,
         size: newFile.size
      });

      return newFile;
   }

   private async updateImagePrefixes(file: TFile, oldPrefix: string, newPrefix: string) {
      // Récupérer le contenu du fichier
      const content = await file.vault.read(file);
      
      // Regex pour trouver les images avec l'ancien préfixe
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(([^\\)]*)${oldPrefix}_\\d+\\.[a-zA-Z]+\\)`, 'g');
      
      // Compter les occurrences
      const matches = content.match(regex);
      if (!matches?.length) {
         new Notice(getTranslation('notices.noImagesUpdated')
            .replace('{prefix}', oldPrefix));
         return;
      }

      // Remplacer les occurrences
      const newContent = content.replace(regex, (match, alt, path) => {
         const timestamp = new Date().getTime();
         const extension = match.split('.').pop()?.replace(')', '') || '';
         return `![${alt}](${path}${newPrefix}_${timestamp}.${extension})`;
      });

      // Sauvegarder le fichier si des modifications ont été faites
      if (content !== newContent) {
         await file.vault.modify(file, newContent);
         
         new Notice(
            getTranslation('notices.imagesUpdated')
               .replace('{count}', matches.length.toString())
               .replace('{prefix}', newPrefix), 
            10000 // durée en millisecondes
         );
         
         new Notice(getTranslation('notices.prefixUpdated')
            .replace('{oldPrefix}', oldPrefix)
            .replace('{newPrefix}', newPrefix));
      }
   }

   private static escapeRegExp(string: string): string {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   }

   /**
    * Détermine si une URL est une image cloud
    * @param url L'URL à vérifier
    * @returns true si c'est une image cloud
    */
   public static isCloudImage(url: string): boolean {
      return url.startsWith('http') && (
         url.includes('cloudinary.com') ||
         url.includes('bunny.net') ||
         url.includes('b-cdn.net') ||
         url.includes('cloudflare') ||
         url.includes('twicpics.com')
      );
   }

   /**
    * Nettoie une URL d'image en retirant les paramètres de taille
    * @param url L'URL à nettoyer
    * @returns L'URL nettoyée
    */
   public static cleanImageUrl(url: string): string {
      // Pour les images cloud, retirer les paramètres d'URL
      if (url.startsWith('http')) {
         const [baseUrl] = url.split('?');
         return baseUrl.split('|')[0]; // Retirer aussi les paramètres de taille
      }
      // Pour les images locales, retirer les paramètres de taille
      return url.split('|')[0];
   }

   /**
    * Retourne les patterns regex pour trouver les liens d'images dans un fichier markdown
    * @param url L'URL de l'image (peut être une URL cloud ou un chemin local)
    * @returns Un objet contenant les différents patterns
    */
   public static getImagePatterns(url: string): { wiki: string, markdown: string, markdownNoAlt: string } {
      const cleanUrl = FileNameService.cleanImageUrl(url);
      
      // Pour les images locales avec une URL complète (app://...)
      if (cleanUrl.startsWith('app://')) {
         // Extraire le nom du fichier de l'URL complète
         const parts = decodeURIComponent(cleanUrl).split('Dev - Plugin Obsidian/');
         const fileName = parts[parts.length - 1].split('?')[0];
         const escapedFileName = FileNameService.escapeRegExp(fileName);
         
         return {
            wiki: `!?\\[\\[${escapedFileName}(?:\\|\\d+)?\\]\\]`,
            markdown: `!?\\[([^\\]]*)\\]\\(${escapedFileName}(?:\\|\\d+)?\\)`,
            markdownNoAlt: `!?\\[\\]\\(${escapedFileName}(?:\\|\\d+)?\\)`
         };
      }
      
      // Pour les URLs externes
      if (cleanUrl.startsWith('http')) {
         const escapedUrl = FileNameService.escapeRegExp(cleanUrl);
         return {
            wiki: `!?\\[\\[${escapedUrl}(?:\\?[^\\]]*)?\\]\\]`,
            markdown: `!?\\[([^\\]]*)\\]\\(${escapedUrl}(?:\\?[^)]*)?\\)`,
            markdownNoAlt: `!?\\[\\]\\(${escapedUrl}(?:\\?[^)]*)?\\)`
         };
      }
      
      // Pour les chemins locaux simples
      const escapedUrl = FileNameService.escapeRegExp(cleanUrl);
      return {
         wiki: `!?\\[\\[${escapedUrl}(?:\\|\\d+)?\\]\\]`,
         markdown: `!?\\[([^\\]]*)\\]\\(${escapedUrl}(?:\\|\\d+)?\\)`,
         markdownNoAlt: `!?\\[\\]\\(${escapedUrl}(?:\\|\\d+)?\\)`
      };
   }

   /**
    * Supprime tous les liens vers une image dans un contenu markdown
    * @param content Le contenu markdown
    * @param url L'URL de l'image à supprimer
    * @returns Le nouveau contenu sans les liens
    */
   public static removeImageLinks(content: string, url: string): string {
      const patterns = FileNameService.getImagePatterns(url);
      let newContent = content;

      console.log('🔍 Patterns de suppression:', patterns);
      console.log('📄 URL à supprimer:', url);
      console.log('📝 Contenu avant:', content);

      // Appliquer chaque pattern
      Object.values(patterns).forEach(pattern => {
         const regex = new RegExp(pattern, 'g');
         const matches = content.match(regex);
         if (matches) {
            console.log('✅ Matches trouvés:', matches);
         }
         newContent = newContent.replace(regex, '');
      });

      console.log('📝 Contenu après:', newContent);
      return newContent;
   }

   /**
    * Met à jour tous les liens vers une image dans un contenu markdown
    * @param content Le contenu markdown
    * @param oldUrl L'ancienne URL de l'image
    * @param newUrl La nouvelle URL de l'image
    * @returns Le nouveau contenu avec les liens mis à jour
    */
   public static updateImageLinks(content: string, oldUrl: string, newUrl: string): string {
      const oldPatterns = FileNameService.getImagePatterns(oldUrl);
      let newContent = content;

      // Construire les patterns de remplacement
      const cleanNewUrl = FileNameService.cleanImageUrl(newUrl);
      
      // Remplacer chaque type de lien
      const wikiRegex = new RegExp(oldPatterns.wiki, 'g');
      const markdownRegex = new RegExp(oldPatterns.markdown, 'g');
      const markdownNoAltRegex = new RegExp(oldPatterns.markdownNoAlt, 'g');

      if (wikiRegex.test(content)) {
         // Réinitialiser lastIndex car test() l'a modifié
         wikiRegex.lastIndex = 0;
         newContent = newContent.replace(
            wikiRegex,
            (match) => match.startsWith('!') ? `![[${cleanNewUrl}]]` : `[[${cleanNewUrl}]]`
         );
      }

      if (markdownRegex.test(content)) {
         // Réinitialiser lastIndex
         markdownRegex.lastIndex = 0;
         newContent = newContent.replace(
            markdownRegex,
            (match, altText) => match.startsWith('!') ? `![${altText}](${cleanNewUrl})` : `[${altText}](${cleanNewUrl})`
         );
      }

      if (markdownNoAltRegex.test(content)) {
         // Réinitialiser lastIndex
         markdownNoAltRegex.lastIndex = 0;
         newContent = newContent.replace(
            markdownNoAltRegex,
            (match) => match.startsWith('!') ? `![](${cleanNewUrl})` : `[](${cleanNewUrl})`
         );
      }

      return newContent;
   }
} 