// Styles de base pour le plugin
const baseStyles = `
    .mediaflowz-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    /* Style pour les champs de saisie sensibles (clés API, secrets) */
    .mediaflowz-setting-item input[type="password"],
    .mediaflowz-setting-item input[data-type="password"] {
        font-family: monospace;
        letter-spacing: 0.1em;
    }

    /* Animations de transition */
    .mediaflowz-service-settings-section {
        opacity: 1;
        transform: translateY(0);
        transition: opacity 150ms ease-in-out, transform 150ms ease-in-out;
    }

    .mediaflowz-service-settings-section.fade-out {
        opacity: 0;
        transform: translateY(-10px);
    }

    .mediaflowz-service-settings-section.fade-in {
        animation: fadeIn 150ms ease-in-out forwards;
    }

    .mediaflowz-info-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 8px 12px;
        border-radius: 0 0 4px 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9em;
        animation: slideUp 0.3s ease-out;
        z-index: 1;
    }

    .mediaflowz-info-bar.error {
        background-color: var(--background-modifier-error);
        color: white;
    }

    .mediaflowz-info-bar.info {
        background-color: var(--background-modifier-success);
        color: var(--text-on-accent);
    }

    .mediaflowz-info-bar > span:first-child {
        flex: 1;
        margin-right: 8px;
        line-height: 1.4;
    }

    .mediaflowz-info-bar-close {
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.2s;
        padding: 4px 8px;
        margin: -4px -8px -4px 0;
        border-radius: 3px;
        font-size: 18px;
        line-height: 1;
        color: var(--text-on-accent);
    }

    .mediaflowz-info-bar-close:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.1);
    }

    @keyframes slideUp {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }

    .mediaflowz-info-bar.fade-out {
        animation: fadeOut 0.3s ease-out forwards;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* Styles pour la liste des dossiers ignorés */
    .mediaflowz-ignored-folders-list {
        margin: 1em 0;
    }

    .mediaflowz-ignored-folder-item {
        display: flex;
        align-items: center;
        padding: 0.5em;
        margin-bottom: 0.5em;
        background: var(--background-secondary);
        border-radius: 4px;
        transition: background-color 150ms ease-in-out;
    }

    .mediaflowz-ignored-folder-item:hover {
        background: var(--background-secondary-alt);
    }

    .mediaflowz-ignored-folder-item .mediaflowz-setting-item {
        border: none;
        padding: 0;
        margin: 0;
        flex-grow: 1;
    }

    .mediaflowz-ignored-folder-item .mediaflowz-setting-item-control {
        justify-content: flex-end;
        padding-right: 0;
    }

    .mediaflowz-ignored-folder-item .mediaflowz-setting-item-name {
        padding: 0 1em;
        font-family: var(--font-monospace);
        color: var(--text-normal);
    }

    /* Animation pour l'ajout/suppression de dossiers */
    .mediaflowz-ignored-folder-item {
        animation: slideIn 150ms ease-out forwards;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-10px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .mediaflowz-image-buttons-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 10px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 5px;
        margin: 10px 0;
    }

    .mediaflowz-image-preview-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
    }

    .mediaflowz-image-preview {
        max-width: 100%;
        height: auto;
        border-radius: 3px;
    }

    .mediaflowz-image-error {
        opacity: 0.5;
        filter: grayscale(100%);
        border: 2px solid var(--text-error);
    }

    .mediaflowz-image-error-message {
        color: var(--text-error);
        font-size: 0.9em;
        padding: 5px;
        background-color: var(--background-modifier-error);
        border-radius: 3px;
        margin-top: 5px;
    }

    .mediaflowz-markdown-link-container {
        font-family: var(--font-monospace);
        font-size: 0.9em;
        padding: 5px;
        background-color: var(--background-secondary);
        border-radius: 3px;
    }

    .mediaflowz-buttons-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .mediaflowz-slider-container {
        width: 100%;
        padding: 0 10px;
    }

    .mediaflowz-image-slider {
        width: 100%;
        height: 20px;
        -webkit-appearance: none;
        background: var(--background-modifier-border);
        outline: none;
        border-radius: 10px;
        transition: background 0.2s;
    }

    .mediaflowz-image-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--interactive-accent);
        cursor: pointer;
        transition: background 0.2s;
    }

    .mediaflowz-image-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--interactive-accent);
        cursor: pointer;
        transition: background 0.2s;
        border: none;
    }

    .mediaflowz-image-slider:hover {
        background: var(--background-modifier-border-hover);
    }

    .mediaflowz-image-slider::-webkit-slider-thumb:hover {
        background: var(--interactive-accent-hover);
    }

    .mediaflowz-image-slider::-moz-range-thumb:hover {
        background: var(--interactive-accent-hover);
    }

    .mediaflowz-button-group {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
    }

    .mediaflowz-image-button {
        padding: 5px 10px;
        border: none;
        border-radius: 3px;
        background-color: var(--interactive-normal);
        color: var(--text-normal);
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .mediaflowz-image-button:hover {
        background-color: var(--interactive-hover);
    }
`;

// Styles pour la barre d'outils des images
const toolbarStyles = `
    .mediaflowz-image-buttons-wrapper {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 8px 0;
        padding: 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-primary);
    }

    .mediaflowz-image-url-display {
        font-family: var(--font-monospace);
        color: var(--text-muted);
        padding: 4px;
        background: var(--background-secondary);
        border-radius: 4px;
        word-break: break-all;
        cursor: text;
        outline: none;
    }

    .mediaflowz-image-url-display:focus {
        background: var(--background-modifier-form-field);
        color: var(--text-normal);
    }

    .mediaflowz-image-preview-wrapper {
        display: flex;
        justify-content: center;
        background: var(--background-secondary);
        padding: 8px;
        border-radius: 4px;
    }

    .mediaflowz-image-preview {
        max-height: 200px;
        width: auto;
        border-radius: 4px;
    }

    .mediaflowz-buttons-container {
        display: flex;
        gap: 16px;
        justify-content: flex-end;
        align-items: center;
        width: 100%;
        padding-right: 0;
    }

    .mediaflowz-slider-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        flex: 1;
        min-width: 0;
    }

    .mediaflowz-image-slider {
        width: 100%;
        margin: 0;
    }

    .mediaflowz-slider-labels {
        display: flex;
        justify-content: space-between;
        width: 100%;
        font-size: 10px;
        color: var(--text-muted);
        padding: 0 2px;
    }

    .mediaflowz-button-group {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
    }

    .mediaflowz-image-button {
        padding: 4px 12px;
        border-radius: 4px;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        cursor: pointer;
        font-size: 12px;
    }

    .mediaflowz-image-button:hover {
        opacity: 0.8;
    }

    .mediaflowz-markdown-link-container {
        font-family: var(--font-monospace);
        padding: 4px;
        background: var(--background-secondary);
        border-radius: 4px;
    }

    .mediaflowz-alt-text-display,
    .mediaflowz-url-display {
        color: var(--text-normal);
        min-width: 20px;
        outline: none;
        margin: 0;
        padding: 0;
    }

    .mediaflowz-alt-text-display:focus,
    .mediaflowz-url-display:focus {
        background: var(--background-modifier-form-field);
        border-radius: 2px;
    }
`;

// Styles pour les boutons de la section des dossiers ignorés
const ignoredFoldersStyles = `
    .mediaflowz-ignored-folders-section {
        margin-top: 2rem;
    }

    .mediaflowz-ignored-folders-list {
        margin-top: 1rem;
    }

    .mediaflowz-ignored-folder-item {
        margin: 0.5rem 0;
    }

    .mediaflowz-ignored-folder-item .mediaflowz-setting-item {
        padding: 0.3rem 0.5rem;
        border: none;
    }

    .mediaflowz-ignored-folder-item .mediaflowz-setting-item-control {
        padding: 0;
    }

    .mediaflowz-ignored-folder-item .mediaflowz-setting-item-name {
        padding: 0;
    }

    .mediaflowz-setting-item-control button {
        margin-left: 0.5rem;
        padding: 4px 8px;
    }
`;

let styleElement: HTMLStyleElement | null = null;

/**
 * Enregistre les styles du plugin dans le DOM
 */
export function registerStyles() {
    console.log('🎨 Enregistrement des styles...');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.setAttribute('type', 'text/css');
        styleElement.textContent = `
            ${baseStyles}
            ${toolbarStyles}
            ${ignoredFoldersStyles}
        `;
        document.head.appendChild(styleElement);
        console.log('✅ Styles enregistrés avec succès');
    } else {
        console.log('⚠️ Les styles sont déjà enregistrés');
    }
}

/**
 * Supprime les styles du plugin du DOM
 */
export function unregisterStyles() {
    console.log('🗑️ Suppression des styles...');
    if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
        styleElement = null;
        console.log('✅ Styles supprimés avec succès');
    } else {
        console.log('⚠️ Aucun style à supprimer');
    }
} 