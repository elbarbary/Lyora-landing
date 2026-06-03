# LYORA GitHub Pages Site

This folder is ready for GitHub Pages.

## Publish from GitHub

1. Create a new public GitHub repository.
2. Upload everything in this folder to the repository root:
   - `index.html`
   - `assets/`
   - `.nojekyll`
   - optional: `CNAME` if you are using your own domain
3. Go to repository **Settings -> Pages**.
4. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save. GitHub will give you a URL like `https://yourname.github.io/repository-name/`.

## Use your Namecheap domain

Rename `CNAME.example` to `CNAME` and replace `yourdomain.com` with your real domain, for example:

```txt
lyora.com
```

Then configure DNS in Namecheap:

- For `www`, add a `CNAME` record pointing to your GitHub Pages hostname, usually `YOUR-GITHUB-USERNAME.github.io`.
- For the root domain, add GitHub Pages apex records in Namecheap's DNS panel.
- In GitHub Pages settings, add the same custom domain and enable HTTPS after DNS finishes resolving.

## Before launch

Open `index.html` and replace `hello@lyora.com` with your real inbox.

If the app store pages go live later, replace the waitlist links with the real App Store and Google Play URLs.
