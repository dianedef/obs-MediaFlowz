// Mock basique de CodeMirror pour les tests
export const EditorView = {
    // Mock des fonctionnalités de base
    updateListener: {
        of: () => ({ from: 0, to: 0 })
    },
    lineWrapping: true,
    theme: {
        light: 'light',
        dark: 'dark'
    }
};

export const ViewPlugin = {
    fromClass: (cls: any, spec: any) => ({
        class: cls,
        spec: spec
    })
};

export const Decoration = {
    mark: () => ({
        range: (from: number, to: number) => ({ from, to })
    })
}; 