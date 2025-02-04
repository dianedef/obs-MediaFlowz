import { http, HttpResponse } from 'msw';

// Définition des handlers pour l'API Cloudinary
export const handlers = [
    // Handler par défaut pour l'upload de fichiers
    http.post('*/auto/upload', async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get('file');
        
        // Vérifier si le fichier existe
        if (!file) {
            return new HttpResponse(null, {
                status: 400,
                statusText: 'No file provided'
            });
        }

        // Simuler une réponse réussie
        return HttpResponse.json({
            secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/test.jpg',
            public_id: 'test',
            format: 'jpg',
            resource_type: 'image'
        });
    })
];

// Handler pour simuler une erreur réseau
export const networkErrorHandler = http.post('*/auto/upload', () => {
    return HttpResponse.error();
}); 