# Configuration de Cloudflare Images pour MediaFlowz

## Prérequis

1. **Compte Cloudflare**
   - Un compte Cloudflare actif
   - Un domaine configuré sur Cloudflare (pour servir les images)

2. **Abonnement Cloudflare Images**
   - Rendez-vous sur [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Allez dans la section "Images"
   - Activez le service Cloudflare Images

## Configuration de Cloudflare Images

1. **Créer une clé API**
   - Dans le dashboard Cloudflare, allez dans "Gérer le compte"
   - Cliquez sur "Jetons d'API"
   - Sélectionnez "Créer un jeton"
   - Utilisez le modèle "Cloudflare Images & Stream"
   - Vérifiez que les permissions incluent :
     - Images : Lecture et Écriture
     - Stream : Lecture et Écriture
   - Cliquez sur "Continuer vers le résumé"
   - Cliquez sur "Créer un jeton"
   - **Important** : Copiez et conservez le jeton généré, il ne sera plus affiché ensuite

2. **Récupérer les informations nécessaires**
   - **Account ID** : Visible dans l'URL du dashboard ou dans "Account Home"
   - **API Token** : Le jeton que vous venez de créer
   - **Domaine de livraison** : Votre sous-domaine Cloudflare Images (format : imagedelivery.net)

## Configuration du plugin MediaFlowz

1. **Dans Obsidian**
   - Ouvrez les paramètres (Settings)
   - Allez dans la section MediaFlowz
   - Sélectionnez "Cloudflare" comme service

2. **Remplissez les champs**
   - Account ID
   - API Token (le jeton créé précédemment)
   - Variant par défaut (optionnel, "public" par défaut)

## Fonctionnement

1. **Upload d'images**
   - Copiez-collez une image dans votre note Obsidian
   - L'image est automatiquement uploadée vers Cloudflare Images
   - Le lien est remplacé par l'URL Cloudflare Images

2. **Format des URLs**
   ```
   https://imagedelivery.net/votre-account-hash/image-id/variant
   ```

## Configurer un sous-domaine pour vos images Cloudflare

1. Dans le dashboard Cloudflare :
   - Allez dans "Websites"
   - Sélectionnez votre domaine
   - Allez dans "DNS"

2. Ajoutez un nouvel enregistrement DNS :
   ```
   Type: CNAME
   Name: images (ou le sous-domaine que vous voulez)
   Target: imagedelivery.net
   Proxy status: Proxied (activé)
   ```



Dans le contexte d'un enregistrement DNS CNAME, le "Target" est l'adresse de destination vers laquelle le sous-domaine va pointer. 

Pour Cloudflare Images, voici comment configurer l'enregistrement CNAME :

1. Dans le dashboard Cloudflare :
   - Allez dans "Websites"
   - Sélectionnez votre domaine
   - Allez dans "DNS"
   - Cliquez sur "Add record"

2. Configuration :
   ```
   Type: CNAME
   Name: images (ou le sous-domaine que vous souhaitez)
   Target: imagedelivery.net
   Proxy status: ✅ Proxied (important d'activer le proxy)
   TTL: Auto
   ```

Explication :
- `Name: images` = créera `images.votredomaine.com`
- `Target: imagedelivery.net` = redirigera vers le CDN de Cloudflare Images
- `Proxied: ✅` = active le proxy Cloudflare (nécessaire pour le SSL et la sécurité)

Une fois configuré, vous pourrez utiliser ce sous-domaine dans les paramètres du plugin :
```typescript
customDomain: "images.votredomaine.com"
```

Voulez-vous que je vous aide à configurer cet enregistrement DNS ?



3. Modifions le code pour utiliser ce sous-domaine :

```:src/core/services/CloudflareMediaService.ts

```






4. Dans les paramètres du plugin, ajoutez votre sous-domaine :
   ```typescript
   customDomain: "images.votredomaine.com"
   ```

Maintenant, au lieu d'avoir des URLs comme :
```
https://imagedelivery.net/votre-account-id/image-id/public
```

Vous aurez des URLs comme :
```
https://images.votredomaine.com/votre-account-id/image-id/public
```

Avantages de cette approche :
1. Plus simple à mettre en place (pas besoin de Worker)
2. Gestion automatique du SSL par Cloudflare
3. Même performance que l'URL originale
4. Meilleure image de marque avec votre propre domaine

Voulez-vous que je vous aide à configurer l'enregistrement DNS pour votre sous-domaine ?



## Sécurité

- Ne partagez JAMAIS votre jeton API
- Conservez-le dans un gestionnaire de mots de passe sécurisé
- En cas de compromission, révoqué immédiatement le jeton dans le dashboard Cloudflare
- Surveillez régulièrement l'utilisation dans le dashboard Cloudflare

## Support

- [Documentation Cloudflare Images](https://developers.cloudflare.com/images/)
- [Documentation Cloudflare Stream](https://developers.cloudflare.com/stream/) 