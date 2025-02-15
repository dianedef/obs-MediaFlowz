ALPHA VERSION - I don't recommend using it in production yet!

# MediaFlowz - Image and GIF Management with Cloud Uploads
(version FR en dessous)

A powerful Obsidian plugin that facilitates the management of images and GIFs, allowing seamless uploads to cloud storage with advanced features.

## ✨ Key Features

### Smart Image Management
- Easy import of images and GIFs via URL
- Intuitive and responsive user interface

### Cloud Uploads
- Upload images from the editor
- Automatically replace local image links with cloud URLs
- Support for custom domains for better branding and SEO when available in the service
- Secure API communication for uploads

### Supported Services
- Cloudinary
- Cloudflare Images
- TwicPics
- Bunny.net

### Advanced Content Processing
- Image compression and optimization
- Support for various image formats (JPEG, PNG, GIF, SVG, WebP)
- Convert images to WebP format
- Use TinyPNG's image compression service

### Image Handling
- Rename, move, and delete images both locally and in the cloud
- Manage image links in your notes efficiently
- Support for drag-and-drop uploads
- Download media files from copied/pasted content of web pages
- Save attachments next to notes in a folder named after the note
- Download external images in your note, save them locally, and adjust the link to point to the local image files
- Mouse wheel image zoom by pressing ALT
- Rename images upon pasting

### Viewing Options
- Full screen on double-click: All images in the current note will be displayed at the bottom, allowing you to switch between thumbnails to view any image.
- Pin Mode: When enabled, you can click and pop up 1 to 5 images at a time without a mask layer, allowing you to edit and look through your notes while images are being previewed.

### Image Naming
- Set `imageNameKey` in frontmatter: While adding multiple images to one document, images can be named in the same format using `imageNameKey`.
- The plugin will add a prefix/suffix if there's a file of the same name, ensuring unique names for images.

## Available Variables
- **`{{fileName}}`**: Name of the active file, without the ".md" extension.
- **`{{imageNameKey}}`**: This variable is read from the markdown file's frontmatter, from the same key `imageNameKey`.
- **`{{DATE:$FORMAT}}`**: Use `$FORMAT` to format the current date, where `$FORMAT` must be a Moment.js format string (e.g., `{{DATE:YYYY-MM-DD}}`).

### Examples
Here are some examples from pattern to image names (repeat in sequence), variables: `fileName = "My note"`, `imageNameKey = "foo"`:
- `{{fileName}}`: My note, My note-1, My note-2
- `{{imageNameKey}}`: foo, foo-1, foo-2
- `{{imageNameKey}}-{{DATE:YYYYMMDD}}`: foo-20220408, foo-20220408-1, foo-20220408-2

### Duplicate Number Handling
- **Duplicate number at start (or end)**: If enabled, the duplicate number will be added at the start as a prefix for the image name; otherwise, it will be added at the end as a suffix.
- **Duplicate number delimiter**: The delimiter to generate the number prefix/suffix for duplicated names. For example, if the value is `-`, the suffix will be like `-1`, `-2`, `-3`, and the prefix will be like `1-`, `2-`, `3-`.

### Clear Unused Images
- Find Orphaned Images: This plugin helps you keep your vault clean and organized by identifying and managing images that are not linked anywhere in your notes.
  - Move to Obsidian Trash: Files are moved to the `.trash` under the Obsidian Vault.
  - Move to System Trash: Files are moved to the Operating System trash.
  - Permanently Delete: Files are destroyed permanently and cannot be reverted back.

## 🚀 Installation
1. In Obsidian, go to Settings > Third-party plugins
2. Disable restricted mode
3. Click "Browse" and search for "MediaFlowz"
4. Install the plugin

## ⚙️ Configuration
- Set the destination folder for notes
- Choose the format for generated notes
- Configure cloud service settings (e.g., Cloudflare API token)
- Customize note templates

## 📝 Usage
1. Paste an image or GIF URL in the quick command
2. The image is automatically uploaded to the configured cloud service
3. The link is replaced with the cloud URL in your notes
4. Find your images in the configured folder

## 🔧 Technical Details
- Built for Obsidian 1.0.0+
- Uses Cloudflare Images for storage
- Efficient image processing and optimization
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

---
HOW TO USE WITH CLOUDFLARE

# Cloudflare Images Configuration for MediaFlowz

## Prerequisites

1. **Cloudflare Account**
   - An active Cloudflare account
   - A domain configured on Cloudflare (to serve images)

2. **Cloudflare Images Subscription**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Go to the "Images" section
   - Activate the Cloudflare Images service

## Cloudflare Images Configuration

1. **Create an API Key**
   - In the Cloudflare dashboard, go to "Manage Account"
   - Click on "API Tokens"
   - Select "Create a token"
   - Use the "Cloudflare Images & Stream" template
   - Ensure the permissions include:
     - Images: Read and Write
     - Stream: Read and Write
   - Click on "Continue to summary"
   - Click on "Create a token"
   - **Important**: Copy and save the generated token, it will not be displayed again

2. **Retrieve necessary information**
   - **Account ID**: Visible in the dashboard URL or in "Account Home"
   - **API Token**: The token you just created
   - **Delivery Domain**: Your Cloudflare Images subdomain (format: imagedelivery.net)

## MediaFlowz Plugin Configuration

1. **In Obsidian**
   - Open settings (Settings)
   - Go to the MediaFlowz section
   - Select "Cloudflare" as the service

2. **Fill in the fields**
   - Account ID
   - API Token (the token created previously)
   - Default Variant (optional, "public" by default)

## Functionality

1. **Image Upload**
   - Copy-paste an image into your Obsidian note
   - The image is automatically uploaded to Cloudflare Images
   - The link is replaced with the Cloudflare Images URL

2. **URL Format**
   ```
   https://imagedelivery.net/your-account-hash/image-id/variant
   ```

## Configuring a Subdomain for Your Cloudflare Images

1. In the Cloudflare dashboard:
   - Go to "Websites"
   - Select your domain
   - Go to "DNS"

2. Add a new DNS record:
   ```
   Type: CNAME
   Name: images (or the subdomain you want)
   Target: imagedelivery.net
   Proxy status: Proxied (enabled)
   ```

In the context of a DNS CNAME record, the "Target" is the destination address to which the subdomain will point. 

To configure the CNAME record for Cloudflare Images:

1. In the Cloudflare dashboard:
   - Go to "Websites"
   - Select your domain
   - Go to "DNS"
   - Click on "Add record"

2. Configuration:
   ```
   Type: CNAME
   Name: images (or the subdomain you want)
   Target: imagedelivery.net
   Proxy status: ✅ Proxied (important to enable the proxy)
   TTL: Auto
   ```

Explanation:
- `Name: images` = will create `images.yourdomain.com`
- `Target: imagedelivery.net` = will redirect to the Cloudflare Images CDN
- `Proxied: ✅` = enables the Cloudflare proxy (necessary for SSL and security)

Once configured, you can use this subdomain in the plugin settings:
```typescript
customDomain: "images.yourdomain.com"
```