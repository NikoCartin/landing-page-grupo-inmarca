# Grupo Inmarca Landing Page

Responsive website for Grupo Inmarca, the Costa Rican distributor of Brazilian fashion brands.

- Live website: https://grupoinmarca.com/
- Project source: https://github.com/NikoCartin/landing-page-grupo-inmarca
- Lead Developer: Nicolas Cartin Reyes

<p align="center">
  <a href="https://grupoinmarca.com/">
    <img src="docs/screenshot.png" alt="Grupo Inmarca website homepage" width="100%" />
  </a>
</p>

## Project structure

- `index.html`, `styles.css`, `site.js`: responsive static landing page and interactive brand carousel.
- `privacy.js`, `analytics-config.js`: visitor consent controls and consent-gated analytics configuration.
- `assets/`: local brand logos, campaign photography, icons and page imagery.
- `backend/index.php`: same-origin JSON contact endpoint using PHPMailer.
- `backend/PHPMailer/`: PHPMailer library files.
- `backend/config.example.php`: SMTP configuration template. The live `backend/config.php` is intentionally excluded from Git.
- `.htaccess`, `robots.txt`, `sitemap.xml`: Hostinger routing and crawler configuration.
- `docs/screenshot.png`: current website screenshot used in this repository and the profile README banner.

## Local preview

Serve the site root with a local HTTP server:

```sh
python3 -m http.server 3000
```

The contact form uses its WhatsApp fallback on localhost. On the live `grupoinmarca.com` domains it posts JSON to `/backend/index.php`.

## Contact endpoint configuration

The PHP endpoint requires PHP and PHPMailer. On the web server, copy the template to a private configuration file and enter the SMTP values provided by the hosting email service:

```sh
cp backend/config.example.php backend/config.php
```

Edit `backend/config.php` on the server. Never commit it. The repository `.gitignore` excludes that file. The endpoint expects a JSON body with `nombre`, `email`, `telefono` and `mensaje`, and returns JSON with `success: true` only when PHPMailer accepts the message.

## Deploy to Hostinger

Upload the root files and folders into the domain's `public_html` directory. Keep the directory structure unchanged. Install `backend/config.php` on the server before enabling the contact form. Do not upload Git metadata or local dependency folders.

## Privacy and analytics

The page stores consent preferences in browser local storage and loads Google Maps only after external-content consent. GA4 remains disabled until a real Measurement ID is configured in `analytics-config.js` and the visitor grants analytics consent. No analytics identifier or SMTP secret is committed.
