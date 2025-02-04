# MediaFlowz - Uploads for Obsidian
(version FR en dessous)

A powerful Obsidian plugin that transforms YouTube videos into rich Markdown notes with advanced AI features.

### ✨ Key Features

- **Smart Video Management**
  - Easy YouTube video import via URL
  - Organize videos with custom tags
  - Quick video library search
  - Intuitive and responsive user interface

- **Advanced Content Processing**
  - Automatic video metadata extraction
  - Accurate transcription generation
  - Clickable timestamp creation
  - YouTube playlist support

- **AI Features (with OpenAI)**
  - Automatic video summary generation
  - Structured notes from transcriptions
  - Smart key points extraction
  - Automatic content translation


Suppresion des images : 
 - pour les images locales,supprime l'image du fichier markdown et du vault.
 - pour les images en ligne, supprime l'image du fichier markdown et du service en ligne.


### 🚀 Installation

1. In Obsidian, go to Settings > Third-party plugins
2. Disable restricted mode
3. Click "Browse" and search for "MediaFlowz"
4. Install the plugin

### ⚙️ Configuration

- Set notes destination folder
- Choose generated notes format
- Configure transcription preferences
- Add your OpenAI API key for AI features
- Customize note templates

### 📝 Usage

1. Paste a YouTube URL in the quick command
2. Video is automatically analyzed and transcribed
3. A structured note is generated with all elements
4. Find your notes in the configured folder

## 🔧 Technical Details

- Built for Obsidian 1.0.0+
- Uses YouTube Data API v3
- OpenAI GPT integration
- Efficient video processing
- Robust error handling
- Secure API communication

## Terms of Use
This plugin is protected by copyright. Use is subject to the following conditions:
- Personal use only via the Obsidian Community Plugin Store
- Modification and redistribution prohibited
- Commercial use prohibited without explicit agreement

---
HOW TO USE WITH BUNNYCDN

~ Create a storage zone

To use Bunny CDN with this plugin, you need to create a storage zone where we will upload and store the images.

Go to Delivery > Storage > Add Storage Zone

~ Create a pull zone

Then configure this bunny.net Storage Zone as an origin for the Pull Zone you will need to create too. A pull zone is the 'zone' that users will request content through, accelerating the loading speed of cached web assets.

Upon creation of a pull zone, bunny.net will assign a new hostname address such as mywebsite.b-cdn.net. You will then be able to use this address to quickly deliver your content. When requests are made, bunny.net will automatically pull content from your configured origin, and cache it on the edge CDN. 

For example, if your file is typically located at: https://mywebsite.com/image.jpg
The same file will now be available at: https://mywebsite.b-cdn.net/image.jpg

Choose "origin type" as "Storage Zone" and select your previously created Storage Zone.

~ Link to a custom hostname

If you want to use a custom hostname, that'll be better for SEO, you can do it. You'll be able to pull you images from your own domain then, not only from b-cdn.net.

in Delivery > CDN > General > Hostnames you can add your custom hostname. Custom hostnames can be used instead of our default b-cdn.net hostname. After adding the hostname, create a CNAME record that direct to YourChoosenStorageZoneNameInStepBefore.b-cdn.net on your DNS provider/hosting platform.
