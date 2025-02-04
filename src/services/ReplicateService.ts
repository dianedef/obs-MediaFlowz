import Replicate from "replicate";

export class ReplicateService {
    private replicate: Replicate;

    constructor(apiKey: string) {
        this.replicate = new Replicate({
            auth: apiKey,
        });
    }

    async generateImage(prompt: string, model: string = "stability-ai/sdxl"): Promise<string> {
        try {
            const output = await this.replicate.run(
                model,
                {
                    input: {
                        prompt: prompt
                    }
                }
            );

            // Replicate retourne généralement un tableau d'URLs d'images
            if (Array.isArray(output) && output.length > 0) {
                return output[0];
            }
            
            throw new Error("Aucune image générée");
        } catch (error) {
            console.error("Erreur lors de la génération d'image:", error);
            throw error;
        }
    }
} 