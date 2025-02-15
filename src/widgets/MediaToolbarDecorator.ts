import { Plugin } from 'obsidian';
import { 
    Decoration, 
    DecorationSet, 
    EditorView, 
    PluginValue,
    ViewUpdate
} from '@codemirror/view';
import { RangeSetBuilder, StateEffect } from '@codemirror/state';
import { ImageWidget } from '@/widgets/ImageWidget';
import { MediaLinkType } from '@/types/media';
import { ImagePathService } from '@/utils/ImagePathService';

const mediaTransform = StateEffect.define<boolean>();

export class MediaToolbarDecorator implements PluginValue {
    private _decorations: DecorationSet;
    private imagePathService: ImagePathService;
    
    constructor(protected view: EditorView, protected plugin: Plugin) {
        this.imagePathService = ImagePathService.getInstance(this.plugin.app);
        this._decorations = this.buildDecorations(view);
    }

    get decorations(): DecorationSet {
        return this._decorations;
    }

    update(update: ViewUpdate): void {
        if (!this.shouldProcessUpdate(update)) {
            return;
        }
        this._decorations = this.buildDecorations(update.view);
    }

    private shouldProcessUpdate(update: ViewUpdate): boolean {
        if (!update.docChanged) {
            return false;
        }

        return !update.transactions.some(tr => 
            tr.effects.some(e => e.is(mediaTransform))
        );
    }

    private buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const doc = view.state.doc;
        let lastPos = 0;

        for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const text = line.text;

            // Détection des liens markdown
            const mdRegex = /\[([^\]|]*?)(?:\|(\d+))?\]\(([^)]+?\.(?:jpg|jpeg|png|gif|svg|webp)(?:[^)]*?))\)/gi;
            let mdMatch;
            while ((mdMatch = mdRegex.exec(text)) !== null) {
                const start = line.from + mdMatch.index;
                const end = start + mdMatch[0].length;
                if (start < lastPos) continue;

                const linkInfo = {
                    url: mdMatch[3],
                    altText: mdMatch[1],
                    size: mdMatch[2] || ''
                };

                console.log('🔍 Match trouvé:', {
                    full: mdMatch[0],
                    altText: linkInfo.altText,
                    size: linkInfo.size,
                    url: linkInfo.url
                });

                const fullUrl = linkInfo.size ? `${linkInfo.url}|${linkInfo.size}` : linkInfo.url;

                builder.add(
                    end,
                    end,
                    Decoration.widget({
                        widget: new ImageWidget(this.plugin, {
                            originalUrl: fullUrl,
                            resolvedUrl: this.imagePathService.getFullPath(
                                linkInfo.url,
                                this.plugin.app.workspace.getActiveFile()?.path || ''
                            ),
                            type: this.detectLinkType(linkInfo.url),
                            altText: linkInfo.altText
                        }, start),
                        side: 1
                    })
                );
                lastPos = end;
            }

            // Détection des liens wiki
            const wikiRegex = /\[\[([^\]]*\.(jpg|jpeg|png|gif|svg|webp)[^\]]*)\]\]/gi;
            let wikiMatch;
            while ((wikiMatch = wikiRegex.exec(text)) !== null) {
                const start = line.from + wikiMatch.index;
                const end = start + wikiMatch[0].length;
                if (start < lastPos) continue;

                const parts = wikiMatch[1].split('|');
                const linkInfo = {
                    url: parts[0],
                    altText: parts[1] || ''
                };

                builder.add(
                    end,
                    end,
                    Decoration.widget({
                        widget: new ImageWidget(this.plugin, {
                            originalUrl: linkInfo.url,
                            resolvedUrl: this.imagePathService.getFullPath(
                                linkInfo.url,
                                this.plugin.app.workspace.getActiveFile()?.path || ''
                            ),
                            type: this.detectLinkType(linkInfo.url),
                            altText: linkInfo.altText
                        }, start),
                        side: 1
                    })
                );
                lastPos = end;
            }
        }

        return builder.finish();
    }

    private detectLinkType(url: string): MediaLinkType {
        if (this.imagePathService.isUrl(url)) {
            if (url.includes('cloudinary.com')) return MediaLinkType.CLOUDINARY;
            if (url.includes('bunny.net') || url.includes('b-cdn.net')) return MediaLinkType.BUNNY;
            if (url.includes('cloudflare')) return MediaLinkType.CLOUDFLARE;
            if (url.includes('twicpics.com')) return MediaLinkType.TWICPICS;
            return MediaLinkType.EXTERNAL;
        }
        
        return url.includes('[[') ? MediaLinkType.WIKI : MediaLinkType.LOCAL;
    }

    destroy(): void {
        this._decorations = Decoration.none;
    }
} 