<template>
  <div class="image-generator">
    <div class="input-section">
      <textarea 
        v-model="prompt" 
        :placeholder="t('imageGenerator.promptPlaceholder')"
        class="prompt-input"
      ></textarea>
      <button 
        @click="generateImage" 
        :disabled="isGenerating"
        class="generate-button"
      >
        {{ isGenerating ? t('imageGenerator.generating') : t('imageGenerator.generate') }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="generatedImageUrl" class="result-section">
      <img :src="generatedImageUrl" alt="Generated image" class="generated-image" />
      <button @click="insertImage" class="insert-button">
        {{ t('imageGenerator.insert') }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { ReplicateService } from '@/services/ReplicateService';

export default defineComponent({
  name: 'ImageGenerator',
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  setup(props, { emit }) {
    const { t } = useI18n();
    const prompt = ref('');
    const isGenerating = ref(false);
    const error = ref('');
    const generatedImageUrl = ref('');
    
    let replicateService: ReplicateService;

    try {
      replicateService = new ReplicateService(props.settings.replicateApiKey);
    } catch (e) {
      error.value = t('imageGenerator.apiKeyError');
    }

    const generateImage = async () => {
      if (!prompt.value.trim()) {
        error.value = t('imageGenerator.emptyPromptError');
        return;
      }

      isGenerating.value = true;
      error.value = '';

      try {
        const imageUrl = await replicateService.generateImage(prompt.value);
        generatedImageUrl.value = imageUrl;
      } catch (e) {
        error.value = t('imageGenerator.generationError');
        console.error(e);
      } finally {
        isGenerating.value = false;
      }
    };

    const insertImage = () => {
      if (generatedImageUrl.value) {
        emit('insert-image', generatedImageUrl.value);
      }
    };

    return {
      prompt,
      isGenerating,
      error,
      generatedImageUrl,
      generateImage,
      insertImage,
      t
    };
  }
});
</script>

<style scoped>
.image-generator {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prompt-input {
  width: 100%;
  min-height: 100px;
  padding: 0.5rem;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  resize: vertical;
}

.generate-button, .insert-button {
  padding: 0.5rem 1rem;
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.generate-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: var(--text-error);
  padding: 0.5rem;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.generated-image {
  max-width: 100%;
  border-radius: 4px;
}
</style> 