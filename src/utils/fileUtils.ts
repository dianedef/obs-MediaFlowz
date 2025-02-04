/**
 * Nettoie un nom de fichier en retirant les caractères spéciaux
 * @param fileName Le nom du fichier à nettoyer
 * @returns Le nom du fichier nettoyé
 */
export function sanitizeFileName(fileName: string): string {
    return fileName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')  // Remplace les caractères spéciaux par des tirets
        .replace(/^-+|-+$/g, '')      // Retire les tirets au début et à la fin
        .substring(0, 50);            // Limite la longueur à 50 caractères
}

/**
 * Extrait l'extension d'un nom de fichier
 * @param fileName Le nom du fichier
 * @returns L'extension du fichier (sans le point)
 */
export function getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * Vérifie si un fichier est une image
 * @param fileName Le nom du fichier ou son type MIME
 */
export function isImageFile(fileName: string): boolean {
    const extension = getFileExtension(fileName);
    return /^(jpe?g|png|gif|svg|webp)$/i.test(extension);
} 