# Fortech Media and Marketing

Production website and lead-capture API for Fortech Media and Marketing Pvt Ltd.

## Structure

- Static website: HTML, CSS, JavaScript, images, and portfolio media in the repository root.
- API: `fortune-backend/` (Node.js, Express, Nodemailer).
- Private brochure: `fortune-backend/private/Fortech-Business-Profile.pdf`. It is intentionally outside the public website so it can only be returned after a valid brochure form submission.

## Local development

1. Copy `fortune-backend/.env.example` to `fortune-backend/.env` and add your email credentials.
2. Run `npm install` and `npm start` inside `fortune-backend/`.
3. Serve the repository root at `http://127.0.0.1:5500`.

Set `SKIP_EMAIL=true` only for local API testing. Keep it `false` in production.

## Hostinger VPS deployment

1. Upload the repository to `/var/www/fortunedigi`.
2. Install a supported Node.js LTS release, Nginx, and PM2.
3. In `fortune-backend/`, run `npm ci --omit=dev`.
4. Create `.env` from `.env.example`. Use a Google App Password, never a normal Gmail password.
5. Set `ALLOWED_ORIGINS` to the exact public website origins.
6. Start the API with `pm2 start server.js --name fortech-api` and save it with `pm2 save`.
7. Serve the repository root from the main domain and reverse-proxy `api.fortunedigi.com` to `127.0.0.1:8000`.
8. Enable HTTPS for both hosts with Certbot and redirect HTTP to HTTPS.

Example API proxy block:

```nginx
server {
    server_name api.fortunedigi.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Before launch, confirm:

- `https://api.fortunedigi.com/health` returns a successful JSON response.
- Contact forms deliver email.
- The brochure downloads only after the brochure form succeeds.
- Both domains have valid HTTPS certificates.
- PM2 is configured to restart after a server reboot.
