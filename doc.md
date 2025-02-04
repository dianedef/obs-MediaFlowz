requesturl:
   attend un string forcément OU un ArrayBuffer
   Ne gère pas nativement le FormData
   Ne gère pas automatiquement le multipart/form-data
PicGo :
   Gère nativement les uploads d'images
   A sa propre logique de requête HTTP
   Contourne les limitations d'Obsidian en utilisant son propre système d'upload
https://help.wpcompress.com/en-us/article/understanding-the-url-structure-api-urls-1edfcm6/
https://cloudinary.com/documentation/javascript_integration#landingpage

[AwesomeDog/obsidian-awesome-image: One-stop solution for image management.](https://github.com/AwesomeDog/obsidian-awesome-image)



💾 Command to copy images to a user-defined folder with a uniform name, and update links in your notes.
🔗 Auto download internet images.
⚡ Auto process image the second you paste it, whether it's from internet or is binary format.
🔎 Command to list all images that are not linked by your notes, which can be deleted manually.

## API Cloudflare Images

   il y a deux méthodes :

   ### Direct Upload :
   ```http
   POST /client/v4/accounts/{account_id}/images/v1
   Content-Type: multipart/form-data

   file=@/path/to/image.png
   ```

   ### Base64 Upload :
   ```http
   POST /client/v4/accounts/{account_id}/images/v1
   Content-Type: application/json

   {
   "file": {
      "content": "iVBORw0KGgoAAAANSUhEUgAA...",
      "name": "example.jpg"
   }
   }
   ```

## CORS

   pas d'erreur CORS avec `requestUrl` d'Obsidian car :

   1. `requestUrl` est fourni par Obsidian qui est une application Electron
   2. Electron n'est pas soumis aux restrictions CORS comme un navigateur
   3. C'est pour ça qu'Obsidian fournit cette API, pour contourner les limitations du navigateur

   C'est un des avantages d'utiliser `requestUrl` d'Obsidian plutôt que `fetch` du navigateur :
   - Pas de problèmes CORS
   - Accès direct aux APIs externes
   - Possibilité d'envoyer des requêtes à n'importe quel domaine

## multiformdata

   Le format `multipart/form-data` est juste un format de texte spécifique qui suit cette structure :
   ```
   --boundary
   Content-Disposition: form-data; name="file"; filename="image.png"
   Content-Type: image/png

   [données binaires]
   --boundary--
   ```


   nous voulons envoyer :
   - Le fichier image (données binaires)
   - Le nom du fichier
   - La description alt
   - Et potentiellement d'autres métadonnées

   C'est exactement pour ça que le format `multipart/form-data` existe! Il permet d'envoyer :
   1. Des données textuelles (nom, description, etc.)
   2. Des fichiers binaires
   3. Le tout dans une même requête

   Par exemple, en format `multipart/form-data` ça ressemblerait à :
   ```
   --boundary
   Content-Disposition: form-data; name="file"; filename="image.png"
   Content-Type: image/png

   [données binaires de l'image]
   --boundary
   Content-Disposition: form-data; name="description"

   Ceci est une belle image
   --boundary
   Content-Disposition: form-data; name="alt"

   Description alternative de l'image
   --boundary--
   ```

   Donc nous DEVONS utiliser `multipart/form-data` pour notre cas d'usage. Et c'est POSSIBLE avec `requestUrl` d'Obsidian puisqu'il accepte des strings. Nous devons juste construire manuellement ce format.



   3. Donc techniquement, nous POUVONS :
      - Créer manuellement cette chaîne de texte
      - Insérer les données binaires du fichier
      - Envoyer le tout via `requestUrl`

   C'est exactement ce que fait un navigateur quand il envoie un `FormData`. Il crée juste ce format texte spécifique.

## form

   `FormData` est un objet JavaScript qui permet de construire facilement un ensemble de paires clé/valeur pour envoyer des données dans une requête HTTP. Il est particulièrement utile pour :
   - Envoyer des fichiers
   - Simuler la soumission d'un formulaire HTML
   - Envoyer des données structurées

   `multipart/form-data` est un type de contenu HTTP qui permet d'envoyer :
   - Des fichiers
   - Des données de formulaire
   - Un mélange de données textuelles et binaires

   Voici un exemple simple :
   ```html
   <form method="post" enctype="multipart/form-data">
   <input type="file" name="image">
   <input type="text" name="title">
   </form>
   ```

   Quand ce formulaire est envoyé, le navigateur crée une requête qui ressemble à :
   ```
   POST /upload HTTP/1.1
   Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryABC123

   ------WebKitFormBoundaryABC123
   Content-Disposition: form-data; name="image"; filename="photo.jpg"
   Content-Type: image/jpeg

   [Données binaires de l'image]
   ------WebKitFormBoundaryABC123
   Content-Disposition: form-data; name="title"

   Mon titre
   ------WebKitFormBoundaryABC123--
   ```
### boundary

   Le `boundary` est un séparateur unique qui permet de délimiter les différentes parties d'une requête `multipart/form-data`. 

   Imaginez que vous envoyez plusieurs choses dans une même requête :
   - Un fichier image
   - Un titre
   - Une description

   Le `boundary` agit comme une "frontière" (d'où son nom) entre ces différentes parties. Par exemple :

   ```text
   ------WebKitFormBoundaryABC123   <-- C'est le boundary
   Content-Disposition: form-data; name="image"
   Content-Type: image/jpeg

   [Données de l'image]
   ------WebKitFormBoundaryABC123   <-- Encore le boundary pour séparer
   Content-Disposition: form-data; name="title"

   Mon Titre
   ------WebKitFormBoundaryABC123   <-- Et encore pour la dernière partie
   Content-Disposition: form-data; name="description"

   Ma description
   ------WebKitFormBoundaryABC123-- <-- Le boundary final avec "--" pour indiquer la fin
   ```

   Le `boundary` doit être :
   1. Unique (pour ne pas confondre avec le contenu)
   2. Spécifié dans le header `Content-Type`
   3. Ne jamais apparaître dans le contenu des données

   C'est pour ça que souvent on voit des boundaries comme :
   ```text
   ----WebKitFormBoundary + caractères aléatoires
   ```

   Dans notre cas avec Obsidian, la difficulté est que `requestUrl` ne gère pas nativement ce format, d'où l'idée d'utiliser PicGo qui sait gérer tout ça correctement.

## instructions

   aller dans https://dash.cloudflare.com/b805cca6c486d78d68e7a4498292be56/images/plans?configure=false et s"abonner au service

## roadmap
 
 dans le worker qui fonctionne, le fichier est envoyé directement comme corps de la requête, sans FormData ni ArrayBuffer. Essayons cette approche :

   Elle utilise l'API officielle de Direct Upload (v2)
   Elle permet de gérer les gros fichiers
   Elle gère automatiquement les timeouts et les retries
   Elle permet d'ajouter des métadonnées au fichier

## Picgo

   PicGo est un outil spécialisé pour l'upload d'images qui offre :

   1. **Fonctionnalités principales** :
      - Upload d'images vers différents services (Cloudflare, Imgur, S3, etc.)
      - Gestion des erreurs et retries
      - Support de multiples formats d'images
      - Transformation d'images

   2. **Deux versions** :
      - PicGo (GUI) : Application desktop avec interface graphique
      - PicGo-core : Version Node.js utilisable comme bibliothèque

   3. **Avantages pour Obsidian** :
      - Gère automatiquement les problèmes de CORS
      - Compatible avec l'environnement Electron
      - Supporte de nombreux services d'hébergement
      - Communauté active et nombreux plugins

   4. **Services supportés** :
      - Cloudflare Images
      - GitHub
      - Imgur
      - S3
      - Azure
      - Et bien d'autres...

   C'est une solution populaire dans l'écosystème Obsidian car elle résout beaucoup de problèmes techniques (comme le CORS) que nous rencontrons actuellement.

   Voulez-vous que nous l'intégrions dans notre plugin ?

   Je vois que vous voulez comprendre comment le plugin utilise PicGo. Voici ce que j'ai trouvé :

   Le plugin utilise PicGo-core, qui est une version Node.js de PicGo. L'avantage de PicGo est qu'il :

   1. Gère nativement les problèmes de CORS
   2. Supporte de nombreux services d'hébergement d'images
   3. Fonctionne bien dans l'environnement Electron d'Obsidian

   Pour l'utiliser dans notre plugin, nous devrions :

   1. Installer PicGo-core :
   ```typescript
   import picgo from 'picgo'
   ```

   2. Configurer l'uploader :
   ```typescript
   const PicGo = new picgo()
   PicGo.setConfig({
   'picBed': {
      'uploader': 'cloudflare',
      'cloudflare': {
         'token': settings.imagesToken,
         'accountId': settings.accountId
      }
   }
   })
   ```

   3. Utiliser pour l'upload :
   ```typescript
   const result = await PicGo.upload([file])
   ```

   Voulez-vous que j'implémente cette solution avec PicGo dans notre service CloudflareMediaService ?
## roadmap

### toolkit
   
####  obsidian://show-plugin?id=obsidian-image-toolkit



   After clicking the image, the image will be popped up with transparent mask layer on the background
   You can only click and preview one image at a time
   You cannot edit and look through your notes, or other operations except to view and operate the image in the Normal Mode
   Gallery Navbar:

   All the images in the current note will be displayed at the bottom, and you can switch these thumbs to view any image
   To be able to use this functionality, you need to turn on 'display gallery navbar' on the plugin settings page
   The background color of the gallery navbar and the border color the selected image can be set on the plugin settings page
   Exit:

   Click the outside of the image
   Press Esc
   If it's in full-screen mode, you need to exit full-screen mode firstly, then exit the image preview page and close popup layer.

   Move the image:

   Put your mouse cursor on the image, and directly drag the image to move
   Press configured arrow keys to move the image
   If you set modifier keys (Ctrl, Alt, Shift) for moving the image, you need to hold the modifier keys and press arrow keys at the same time.

   Pin Mode
   When you turn on 'Pin an image' on the settings page, it's in Pin Mode.

   pin_mode_screenshot

   Rule:

   You can click and popped up 1 to 5 images at a time
   Comparing with normal mode, the image will be popped up without mask layer after clicking the image
   It's allowed to edit and look through your notes while images are being popped up and previewed
   Menu:

   When you right click on the popped image, it will show the menu at the right side of your cursor. The menu contains several functions, like zoom, full screen, refresh, rotate, flip, copy, close, etc.
   Exit:

   Press Esc to close the image where your mouse cursor is hovering
   click 'close' button in the menu
   Move the image:

   Put your mouse cursor on the image, and directly drag the image to move

   #### text extractor
   obsidian://show-plugin?id=text-extractor
   #### image auto upload

   Obsidian Image Auto Upload Plugin
   This is a tool that supports uploading images to image beds using PicGo, PicList, and PicGo-Core.
   Remember to restart Obsidian after updating the plugin.

   Not tested on Mac

   Start
   Install the PicGo tool and configure it, refer to the official website
   Enable PicGo's Server service and remember the port number
   Install the plugin
   Open the plugin settings and set it to http://127.0.0.1:{{port set in PicGo}}/upload (e.g., http://127.0.0.1:36677/upload)
   Try to see if the upload is successful
   Set picbed and configName
   If you are using PicList (version >= 2.5.3), you can set the picbed and configName through URL parameters.
   Example: http://127.0.0.1:36677/upload?picbed=smms&configName=piclist
   This will upload the image to the smms picbed and use the piclist configName.
   Using this feature, you can upload images to different picbeds in different Obsidian vaults.

   Features
   Upload when paste image
   When you paste an image to Obsidian, this plugin will automatically upload your image.

   You can set image-auto-upload: false in frontmatter to control one file.

   Supports ".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff", ".webp", ".avif"

   Due to the bug in PicGo 2.3.0-beta7, you cannot use this feature. Please install another version of PicGo.

   ---
   image-auto-upload: true
   ---
   Upload all local images file by command
   press ctrl+P and input upload all images，enter, then will auto upload all local images

   download all internet to local
   press ctrl+P and input download all images，enter, then will auto download all internet images to loacl, only test in win10

   Upload image by contextMenu
   Now you can upload image by contextMenu in edit mode.

   Support drag-and-drop
   Only work for picgo or picList app.

   server mode
   You can deploy PicList or PicList-Core in your server and upload to it.

   Support PicList 2.6.3 later or PicList-Core1.3.0 later

   You can not upload network in this mode.
   If you upload fail when you paste img, you can alse try to enable the mode.

   Support picgo-core
   You can install picgo-core with npm. Reference to doc

## roadmap
The plugin finds all links to external images in your notes, downloads and saves images locally and finally adjusts the link in your note to point to the local image files.





mousewheel image zoom

rename at pasting
convert to webp
img prefix

bulk add captions
TinyPNG's image compression service.


#### obsidian://show-plugin?id=mousewheel-image-zoom


#### clear unused imaegs
obsidian://show-plugin?id=oz-clear-unused-images

Move to Obsidian Trash - Files are going to be moved to the .trash under the Obsidian Vault.

Move to System Trash - Files are going to be moved to the Operating System trash.

Permanently Delete - Files are going to be destroyed permanently. You won't beable to revert back.



#### obsidian://show-plugin?id=image-converter
Image Converter for ObsidianMD
Making image management inside Obsidian slightly more convenient.

https://github.com/xRyul/obsidian-image-converter/assets/47340038/63a0646b-29ec-4055-abfc-55d31e07b2f7


#### paste img rename

obsidian://show-plugin?id=obsidian-paste-image-rename


If you set "Image name pattern" to {{fileName}} (it's the default behavior after 1.2.0),
"New name" will be generated as the name of the active file.

Set imageNameKey frontmatter
While adding a lot of images to one document, people possibly want the images to be named in the same format, that's where imageNameKey is useful.

Then paste an image, you will notice that the "New name" has already been generated as "my-blog", which is exactly the value of imageNameKey:

You can change the pattern for new name generating by updating the "Image name pattern" value in settings.

For a detailed explanation and other features such as auto renaming, please refer to Settings.

Add prefix/suffix to duplicated names
The plugin will always try to add a prefix/suffix if there's a file of the same name.

Let's continue from the last section and paste the second image, the prompt will still show the new name as "my-blog", now if we just click "Rename", the file will be renamed as "my-blog-1.png", not "my-blog.png":


The -1 suffix is generated according to the default settings:

Because "Duplicate number at start" is false, suffix is used rather than prefix
"Duplicate number delimiter" - is put before the number 1
If we paste the third image without editing the "New name" input, its name will be "my-blog-2.png", the number is increased according to the largest number of "my-blog-?.png" in the attachment directory.

This feature is especially powerful if you enable "Auto rename" in settings, you can just add new images without thinking, and they will be renamed sequentially by the pattern and imageNameKey set.

Batch renaming process
New in 1.3.0

You can use the command "Batch rename embeded files in the current file"
to rename images and other attachments (even notes) in the current file.


The image above demonstrates how to rename all the foo-1.png, foo-2.png… png files
to bar-1-png, bar-2.png… with this feature.

You can also rename the images to the same name, and let the plugin handle
the name deduplication for you. See a video demonstration here:
https://i.imgur.com/6UICugX.mp4

Batch rename all images instantly
New in 1.5.0

The command "Batch rename all images instantly (in the current file)" will
rename all the images in the current file according to
"Image name pattern" in settings.

This is a shortcut for using Batch renaming process with certain arguments,
makes everyday image renaming much easier.

Note that this command has no confirmation, please use it with caution!

Handle all attachments
New in 1.4.0

Paste image rename is not just a plugin for pasted images, it has the potential
to handle all attachments that are added to the vault, no matter whether they are pasted
or dragged.

To use this feature, you need to enable the "Handle all attachments" option in settings.


Additionally, you can configure the "Exclude extension pattern" to ignore files
that match the given extension pattern.

FAQ
Q: I pasted an image but the rename prompt did not show up.
A: This is probably because you are using the Windows system and pasting from a file (i.e. the image is copied from File Explorer, not from a browser or image viewer). In Windows, pasting from a file is like a regular file transfer, the original filename is kept rather than being created and named "Pasted image ..." by Obsidian. You need to turn on "Handle all attachments" in settings to make it work in this situation.

Available variables:

{{fileName}}: name of the active file, without ".md" extension.
{{imageNameKey}}: this variable is read from the markdown file's frontmatter, from the same key imageNameKey.
{{DATE:$FORMAT}}: use $FORMAT to format the current date, $FORMAT must be a Moment.js format string, e.g. {{DATE:YYYY-MM-DD}}.
Examples

Here are some examples from pattern to image names (repeat in sequence), variables: fileName = "My note", imageNameKey = "foo":

{{fileName}}: My note, My note-1, My note-2
{{imageNameKey}}: foo, foo-1, foo-2
{{imageNameKey}}-{{DATE:YYYYMMDD}}: foo-20220408, foo-20220408-1, foo-20220408-2
Duplicate number at start (or end)

If enabled, the duplicate number will be added at the start as prefix for the image name, otherwise, it will be added at the end as suffix for the image name.

Duplicate number delimiter

The delimiter to generate the number prefix/suffix for duplicated names. For example, if the value is -, the suffix will be like "-1", "-2", "-3", and the prefix will be like "1-", "2-", "3-".

Auto rename

By default, the rename modal will always be shown to confirm before renaming, if this option is set, the image will be auto renamed after pasting.

Handle all attachments

By default, the rename modal will always be shown to confirm before renaming, if this option is set, the image will be auto renamed after pasting.

Exclude extension pattern

This option is only useful when "Handle all attachments" is enabled.
Write a Regex pattern to exclude certain extensions from being handled. Only the first line will be used.

Disable rename notice

Turn off this option if you don't want to see the notice when renaming images.
Note that Obsidian may display a notice when a link has changed, this option cannot disable that.
#### local img plus
obsidian://show-plugin?id=obsidian-local-images-plus

Downloading media files from copied/pasted content of web pages
Saving attachments next to note in folder named after note
Downloading files embedded in markdown tags from web to vault
Saving base64 embedded images to vault


#### imgur
obsidian://show-plugin?id=obsidian-imgur-plugin

Known limitations
   you can not paste animated gifs from the clipboard (they initially get copied as a static images to the clipboard).
   Use drag and drop instead if you want to upload an animated gif.

#### img context menu
obsidian://show-plugin?id=copy-url-in-preview

#### local img
obsidian://show-plugin?id=obsidian-local-images

#### img captions
obsidian://show-plugin?id=image-captions

Add an image in this format:

![[image.jpg|This is a caption]]
or this format:

![This is a caption](image.jpg)
####
1,Convert the image to jpeg format and compress it
2,store the image in the current notes directory in the images folder
3,Change the name of the image to the name of the current note plus a number

#### Awesome Image
obsidian://show-plugin?id=awesome-image
Awesome Image: Process images for active file
Awesome Image: Process images for all your notes

#### Obsidian Image Uploader
obsidian://show-plugin?id=obsidian-image-uploader

#### img upload toolkit
obsidian://show-plugin?id=image-upload-toolkit

#### copy img
obsidian://show-plugin?id=copy-image

#### media sync
obsidian://show-plugin?id=media-sync

#### emo
obsidian://show-plugin?id=emo-uploader
Obsidian Emo Uploader
      
#### s3 img uploader
obsidian://show-plugin?id=s3-image-uploader

#### cloudinary uploader
obsidian://show-plugin?id=obsidian-cloudinary-uploader

#### tinypnbg img
obsidian://show-plugin?id=tinypng-image

#### cloudinary
obsidian://show-plugin?id=cloudinary

#### img to lskypro
obsidian://show-plugin?id=lskypro-auto-upload
Obsidian LskyPro Auto Upload Plugin

#### find orphaned img
obsidian://show-plugin?id=find-orphaned-images

Find Orphaned Images Plugin for Obsidian
Utility add-on for Obsidian knowledge base.

Find Orphaned Images is an Obsidian plugin designed to help you keep your vault clean and organized by identifying and managing images that are not linked anywhere in your notes. With this plugin, you can:

## nom de domaines

   Pour gérer 3 noms de domaine différents de manière économique, voici les meilleures options :

   2. **Configuration CDN** :
      - **Option gratuite** :
      - Utiliser Cloudflare gratuit comme proxy
      - Configurer les CNAME vers Cloudinary/TwicPics
      - Bénéficier du CDN Cloudflare gratuitement

   1. **Cloudinary** :
      - Version gratuite :
      - Limitée en bande passante
      - Pas de support pour les domaines personnalisés
      - Version Plus (~45€/mois) :
      - Nécessaire pour les domaines personnalisés
      - ~540€/an
      - ~570€/an minimum avec Cloudinary

   1. **Solution Cloudflare R2 + Workers** :
      - Stockage R2 : Prix au Go (~0.015$/Go)
      - Workers : Gratuit jusqu'à 100k requêtes/jour
      - Domaines : ~30€/an
      - Total : Beaucoup moins cher, dépend du volume

   2. **Solution DigitalOcean Spaces** :
      - Stockage : ~5$/mois
      - CDN inclus
      - Domaines : ~30€/an
      - Total : ~90€/an

   3. **Solution Bunny.net** :
      - Storage : ~1$/mois/100GB
      - CDN : Prix très bas par TB
      - Domaines : ~30€/an
      - Total : ~100-150€/an

   Je recommande soit Cloudflare R2 + Workers, soit Bunny.net qui sont beaucoup plus économiques que Cloudinary pour plusieurs domaines.



   Cloudflare R2 est un service de stockage d'objets (object storage) similaire à Amazon S3, mais avec quelques avantages clés :

   1. **Caractéristiques principales** :
      - Stockage de fichiers dans le cloud
      - Compatible avec l'API S3
      - Intégré au réseau CDN mondial de Cloudflare
      - Pas de frais de sortie (egress fees) contrairement à AWS S3

   2. **Tarification avantageuse** :
      - Stockage : $0.015 par GB/mois
      - Opérations : 
      - Classe A (PUT, POST, LIST) : $4.50 par million de requêtes
      - Classe B (GET) : $0.36 par million de requêtes
      - Pas de frais pour le transfert sortant

   3. **Utilisation avec Workers** :
      - Workers = fonctions serverless de Cloudflare
      - Permet de :
      - Transformer les images à la volée
      - Gérer l'authentification
      - Personnaliser les URLs
      - Optimiser les images

   4. **Avantages pour votre cas** :
      - Un seul bucket R2 peut servir vos 3 domaines
      - Configuration via Workers pour router selon le domaine
      - Optimisation des images possible
      - Prix prévisible et économique

   C'est une alternative moderne et économique aux services comme Cloudinary, particulièrement intéressante si vous maîtrisez un peu le développement pour configurer les Workers.



   Oui, Cloudflare propose des transformations d'images avec R2, mais il y a quelques nuances importantes :

   1. **Images Cloudflare** :
      - Service dédié à l'optimisation d'images
      - Transformations disponibles :
      - Redimensionnement
      - Compression
      - Conversion de format (WebP, AVIF)
      - Adaptation selon le device
      - Qualité ajustable
      
   2. **Mise en place** :
      - Nécessite l'utilisation de Cloudflare Workers
      - Deux options :
      ```typescript
      // Option 1 : Images Cloudflare
      const imageURL = "https://votre-worker.dev/image.jpg?width=800&format=auto"
      
      // Option 2 : Workers + API Images
      const image = await fetch(imageURL)
      const transformed = await fetch("https://api.cloudflare.com/client/v4/images/v1/...", {
         body: image
      })
      ```

   3. **Différences avec Cloudinary** :
      - Moins de transformations avancées
      - Configuration plus technique
      - Mais plus économique
      - Nécessite plus de code personnalisé

   4. **Limites** :
      - Taille maximale : 10 MB par image
      - Formats supportés plus limités
      - Transformations moins sophistiquées

   Pour votre plugin, il faudrait développer un nouveau service similaire au `CloudinaryService` mais adapté pour R2 + Images Cloudflare. Souhaitez-vous que je vous montre un exemple de cette implémentation ?





   Je vais vous montrer comment implémenter un service pour Cloudflare R2 + Images. Je vais d'abord créer un nouveau service qui suivra la même structure que notre `CloudinaryService`.

   ```typescript

   ```:src/core/services/CloudflareR2Service.ts

   ```


   Maintenant, nous devons créer le Worker Cloudflare qui va gérer l'upload vers R2 et les transformations d'images. Je vais créer un exemple de Worker :

   ```:worker/r2-worker.ts

   ```


   Voici comment cela fonctionne :

   1. **Service côté plugin** (`CloudflareR2Service.ts`) :
      - Gère l'authentification
      - Prépare les uploads
      - Formate les URLs avec les paramètres de transformation

   2. **Worker Cloudflare** (`r2-worker.ts`) :
      - Gère les uploads vers R2
      - Applique les transformations d'images
      - Sert les images avec cache

   3. **Utilisation** :
      ```typescript
      // Upload d'une image
      const url = await cloudflareService.upload(file);
      
      // URL résultante avec transformations
      // https://votre-worker.dev/image.jpg?width=800&format=auto&quality=80
      ```

   4. **Transformations disponibles** :
      - `width` : Largeur de l'image
      - `height` : Hauteur de l'image
      - `format` : Format de sortie (auto, webp, avif)
      - `quality` : Qualité de compression (auto, 1-100)

   Pour utiliser ce service, il faudra :
   1. Créer un bucket R2 dans Cloudflare
   2. Déployer le Worker
   3. Configurer les variables d'environnement du Worker
   4. Mettre à jour les paramètres du plugin avec vos identifiants

   Voulez-vous que je vous montre comment configurer tout cela dans Cloudflare ?


   Dans notre cas, puisque nous gérons principalement des images, Cloudflare Images est plus adapté que R2 car il offre des optimisations automatiques et un meilleur rapport qualité/prix pour ce cas d'usage spécifique.
   Non, en fait j'ai fait une erreur dans l'implémentation. Cloudflare Images (qui est différent de R2) offre effectivement des optimisations automatiques. Je vais modifier le code pour mieux l'utiliser :

   ```:worker/r2-worker.ts

   ```


   Voici les améliorations apportées :

   1. **Optimisations automatiques** avec Cloudflare Images :
      - Détection automatique du device et de sa résolution
      - Choix automatique du meilleur format (WebP/AVIF)
      - Compression intelligente
      - Mise en cache globale
      - Redimensionnement adaptatif

   2. **Avantages** :
      - Plus besoin de spécifier manuellement width/height/quality
      - Meilleure performance car optimisé selon le device
      - Moins de code à maintenir
      - CDN global inclus

   3. **Prix** :
      - Cloudflare Images : à partir de $5/mois pour 100k images
      - Plus économique que R2 pour les images
      - Inclut toutes les transformations

   4. **Utilisation** :
      ```typescript
      // Upload simple
      const response = await cloudflareService.upload(file);
      // L'URL retournée est déjà optimisée automatiquement
      ```

   Si vous voulez quand même personnaliser certaines images, vous pouvez toujours ajouter des paramètres :
   ```typescript
   // Paramètres optionnels
   const url = response.url;
   const customUrl = `${url}/w=800,q=75`; // Pour une largeur et qualité spécifique
   ```

   C'est beaucoup plus simple et efficace que la version précédente avec R2 !




   R2 est le service de stockage d'objets (object storage) de Cloudflare, similaire à Amazon S3. Voici les points clés :

   1. **Fonctionnalités principales** :
      - Stockage de fichiers dans le cloud
      - Compatible avec l'API S3
      - Intégré au réseau CDN Cloudflare
      - Pas de frais de sortie (contrairement à S3)

   2. **Différence avec Cloudflare Images** :
      - R2 = stockage brut de tout type de fichiers
      - Cloudflare Images = service spécialisé pour les images avec :
      - Optimisation automatique
      - Transformations
      - CDN optimisé pour les images

   3. **Cas d'utilisation** :
      - R2 : 
      - Stockage de fichiers (PDF, ZIP, vidéos...)
      - Backups
      - Assets statiques
      - Cloudflare Images :
      - Uniquement pour les images
      - Quand on veut des optimisations automatiques

   4. **Prix** :
      - R2 : 
      - Stockage : $0.015/GB/mois
      - Pas de frais de sortie
      - Cloudflare Images :
      - À partir de $5/mois pour 100k images
      - Inclut toutes les optimisations
