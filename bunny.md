

Une Pull Zone dans Bunny.net est essentiellement un CDN qui "tire" (pull) le contenu depuis votre stockage d'origine. Voici comment ça fonctionne :

**Concept de Pull Zone :**
1. Vous avez votre stockage d'origine (Storage Zone dans Bunny)
2. La Pull Zone est une couche CDN qui :
   * Met en cache votre contenu
   * Le distribue via le réseau mondial de Bunny
   * "Tire" automatiquement les nouveaux fichiers quand ils sont demandés

**Exemple concret :**
- Storage Zone : `storage.bunnycdn.com/mon-bucket`
- Pull Zone : `mon-site.b-cdn.net`

Quand un utilisateur demande : `mon-site.b-cdn.net/image.jpg`
1. Le CDN vérifie si l'image est en cache
2. Si non, il la "tire" depuis votre Storage Zone
3. La met en cache pour les prochaines demandes

**Avantages :**
* 🌍 Distribution mondiale
* 🚀 Cache automatique
* 🔒 Sécurité additionnelle
* 📊 Statistiques d'utilisation

**Pour votre plugin Obsidian :**
1. Vous uploadez les médias dans la Storage Zone
2. Vous utilisez l'URL de la Pull Zone pour les liens dans Obsidian
3. Les utilisateurs accèdent au contenu via le CDN automatiquement

Voulez-vous que je vous montre comment configurer une Pull Zone pour votre projet ?




Ah oui, c'est tout à fait possible ! Pour utiliser votre propre nom de domaine avec Bunny.net, voici les étapes :

**1. Créer la Pull Zone dans Bunny.net**
- Créez d'abord votre Pull Zone normalement
- Vous obtiendrez une URL du type `mon-site.b-cdn.net`

**2. Configuration DNS**
Vous devrez ajouter un enregistrement CNAME dans votre zone DNS :
```
cdn.monnomdedomaine.fr  CNAME  mon-site.b-cdn.net
```

**3. Dans Bunny.net**
1. Allez dans votre Pull Zone
2. Cliquez sur "Hostnames"
3. Ajoutez votre nom de domaine personnalisé : `cdn.monnomdedomaine.fr`
4. Bunny va générer un certificat SSL automatiquement

**Vérification :**
- Attendez que la propagation DNS soit terminée (peut prendre jusqu'à 24h)
- Testez avec : `https://cdn.monnomdedomaine.fr/votre-fichier`

**Sécurité supplémentaire (optionnel) :**
- Vous pouvez activer "Force SSL"
- Configurer des règles de sécurité spécifiques
- Ajouter des restrictions géographiques

Une fois configuré, dans votre plugin Obsidian, vous utiliserez simplement `https://cdn.monnomdedomaine.fr` comme base pour tous vos liens médias.

Voulez-vous de l'aide pour une étape spécifique de la configuration ?


i amélioré l'affichage dans l'interface pour montrer clairement :
L'URL de pull zone par défaut
Le CDN personnalisé entre parenthèses s'il existe
Maintenant, quand vous ajoutez une zone de stockage :
Vous sélectionnez un dossier (ou le vault entier)
Vous configurez :
Le nom de la zone
La clé d'accès
L'URL de pull zone (CDN par défaut)
Optionnellement, un CDN personnalisé
L'interface affichera alors :
Si pas de CDN personnalisé : https://votre-zone.b-cdn.net
Si CDN personnalisé : https://votre-zone.b-cdn.net (CDN personnalisé: https://cdn.votredomaine.com)




// PUT https://storage.bunnycdn.com/{storageZoneName}/{newPath}
// Header: AccessKey: {storageZonePassword}
// Le contenu du fichier doit être dans le body

// Exemple de fonction
async function renameFile(storageZone, oldPath, newPath, accessKey) {
    // 1. Récupérer le fichier original
    const response = await fetch(`https://storage.bunnycdn.com/${storageZone}/${oldPath}`, {
        headers: {
            'AccessKey': accessKey
        }
    });
    const fileContent = await response.blob();

    // 2. Upload vers le nouveau chemin
    await fetch(`https://storage.bunnycdn.com/${storageZone}/${newPath}`, {
        method: 'PUT',
        headers: {
            'AccessKey': accessKey
        },
        body: fileContent
    });

    // 3. Supprimer l'ancien fichier
    await fetch(`https://storage.bunnycdn.com/${storageZone}/${oldPath}`, {
        method: 'DELETE',
        headers: {
            'AccessKey': accessKey
        }
    });
}