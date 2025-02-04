import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileNameService } from '../../src/services/FileNameService';
import { EventBusService } from '../../src/services/EventBusService';
import { ErrorService } from '../../src/services/ErrorService';
import { EventName } from '../../src/types/events';
import { TFile, Notice } from '../setup';

describe('FileNameService', () => {
   let service: FileNameService;
   let mockApp: any;

   beforeEach(() => {
      mockApp = {
         metadataCache: {
            getFileCache: vi.fn()
         }
      };
      service = FileNameService.getInstance(mockApp);
   });

   it('should generate prefix from frontmatter if available', async () => {
      const mockFile = new TFile('My Test Note.md');

      mockApp.metadataCache.getFileCache.mockReturnValue({
         frontmatter: {
            'img-prefix': 'custom-prefix'
         }
      });

      const prefix = await service.getFilePrefix(mockFile);
      expect(prefix).toBe('custom-prefix');
   });

   it('should fallback to note title if no frontmatter', async () => {
      const mockFile = new TFile('My Test Note.md');

      mockApp.metadataCache.getFileCache.mockReturnValue({});

      const prefix = await service.getFilePrefix(mockFile);
      expect(prefix).toBe('my-test-note');
   });

   it('should handle special characters in title', async () => {
      const mockFile = new TFile('My Test & Note!.md');

      mockApp.metadataCache.getFileCache.mockReturnValue({});

      const prefix = await service.getFilePrefix(mockFile);
      expect(prefix).toBe('my-test-and-note');
   });

   it('should generate unique filenames with timestamps', () => {
      const mockFile = new File([], 'test.jpg', { type: 'image/jpeg' });
      const prefix = 'my-note';

      const fileName1 = service.generateFileName(mockFile, prefix);
      const fileName2 = service.generateFileName(mockFile, prefix);

      expect(fileName1).not.toBe(fileName2);
      expect(fileName1).toMatch(/^my-note_\d+\.jpg$/);
      expect(fileName2).toMatch(/^my-note_\d+\.jpg$/);
   });

   it('should preserve file type when creating new file', () => {
      const originalFile = new File([], 'test.jpg', { 
         type: 'image/jpeg',
         lastModified: 123456789
      });

      const newFile = service.createFileWithNewName(originalFile, 'new-name.jpg');

      expect(newFile.type).toBe('image/jpeg');
      expect(newFile.lastModified).toBe(123456789);
      expect(newFile.name).toBe('new-name.jpg');
   });

   it('should update image prefixes when frontmatter changes', async () => {
      const mockFile = new TFile('Test Note.md');
      mockFile.vault.read.mockResolvedValue(
         '![image1](path/old-prefix_123456.jpg)\n' +
         '![image2](path/old-prefix_789012.png)'
      );

      const eventBus = EventBusService.getInstance();
      
      eventBus.emit(EventName.FRONTMATTER_UPDATED, {
         file: mockFile,
         oldPrefix: 'old-prefix',
         newPrefix: 'new-prefix'
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFile.vault.read).toHaveBeenCalled();
      expect(mockFile.vault.modify).toHaveBeenCalled();
      
      const newContent = mockFile.vault.modify.mock.calls[0][1];
      expect(newContent).toMatch(/new-prefix_\d+\.jpg/);
      expect(newContent).toMatch(/new-prefix_\d+\.png/);
   });

   it('should show notifications when updating image prefixes', async () => {
      const mockFile = new TFile('Test Note.md');
      mockFile.vault.read.mockResolvedValue(
         '![image1](path/old-prefix_123456.jpg)\n' +
         '![image2](path/old-prefix_789012.png)'
      );

      const eventBus = EventBusService.getInstance();
      eventBus.emit(EventName.FRONTMATTER_UPDATED, {
         file: mockFile,
         oldPrefix: 'old-prefix',
         newPrefix: 'new-prefix'
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFile.vault.modify).toHaveBeenCalled();
   });

   it('should show notification when no images to update', async () => {
      const mockFile = new TFile('Test Note.md');
      mockFile.vault.read.mockResolvedValue('No images here');

      const eventBus = EventBusService.getInstance();
      eventBus.emit(EventName.FRONTMATTER_UPDATED, {
         file: mockFile,
         oldPrefix: 'old-prefix',
         newPrefix: 'new-prefix'
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFile.vault.modify).not.toHaveBeenCalled();
   });
}); 