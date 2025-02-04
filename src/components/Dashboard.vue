<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>{{ t('dashboard.title') }}</h2>
    </div>
    
    <div class="dashboard-content">
      <ImageGenerator 
        :settings="settings"
        @insert-image="handleImageInsert"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import ImageGenerator from './ImageGenerator.vue';
import { useI18n } from '../composables/useI18n';
import { MarkdownView, type Plugin } from 'obsidian';

export default defineComponent({
  name: 'Dashboard',
  components: {
    ImageGenerator
  },
  props: {
    plugin: {
      type: Object as () => Plugin,
      required: true
    }
  },
  setup(props) {
    const { t } = useI18n();
    const settings = ref({
      replicateApiKey: ''
    });

    onMounted(async () => {
      settings.value = await props.plugin.loadData() || { replicateApiKey: '' };
    });

    const handleImageInsert = async (imageUrl: string) => {
      const activeView = props.plugin.app.workspace.getActiveViewOfType(MarkdownView);
      if (activeView?.editor) {
        const cursor = activeView.editor.getCursor();
        activeView.editor.replaceRange(`![Generated Image](${imageUrl})\n`, cursor);
      }
    };

    return {
      settings,
      handleImageInsert,
      t
    };
  }
});
</script>

<style scoped>
.dashboard {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-header {
  border-bottom: 1px solid var(--background-modifier-border);
  padding-bottom: 1rem;
}

.dashboard-header h2 {
  margin: 0;
  color: var(--text-normal);
}

.dashboard-content {
  flex: 1;
  overflow-y: auto;
}
</style> 