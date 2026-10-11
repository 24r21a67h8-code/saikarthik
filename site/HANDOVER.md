# Handover Guide: Madishetti Saikarthik Website

## What is in this folder
- `server.js`: the website server (no installs needed, only Node.js 18+)
- `public/index.html`: the public website
- `public/admin.html`: the admin panel (opens at `yoursite.com/admin`)
- `content.default.json`: starting content
- `data/`: created automatically. Holds the live content, enquiries and admin password. **Back this up. Never delete it.**
- `public/uploads/`: uploaded photos and certificates. **Back this up too.**

## A. Test on your computer (5 minutes)
1. Install Node.js (LTS) from nodejs.org.
2. Open a terminal in this folder and run: `ADMIN_PASSWORD="YourStrongPassword" node server.js`
   (Windows PowerShell: `$env:ADMIN_PASSWORD="YourStrongPassword"; node server.js`)
3. Open http://localhost:3000 (site) and http://localhost:3000/admin (admin).

## B. Put it online (choose one)
**Option 1: Hostinger / any host with "Node.js Web App" (easiest for non-technical clients)**
1. Buy hosting plus a domain in the CLIENT'S name and email (see section D).
2. Upload this folder as a zip in the Node.js app section. Startup file: `server.js`.
3. Add environment variable `ADMIN_PASSWORD` before the first start.
4. Start the app and enable the free SSL (https).

**Option 2: VPS (DigitalOcean, AWS Lightsail, Hetzner). Most control, about Rs 400-600/month**
1. Create an Ubuntu server, install Node 18+ and run `sudo npm i -g pm2`.
2. Upload the folder, then: `ADMIN_PASSWORD="..." pm2 start server.js --name site && pm2 save && pm2 startup`
3. Install nginx, proxy port 3000 to the domain, then run `sudo certbot --nginx` for free https.

**Do NOT use** free hosts that wipe files on restart (e.g. Render/Railway free tier without a persistent disk). Enquiries and uploads would be lost.

## C. Domain
Buy the domain (GoDaddy, Namecheap, Hostinger) in the client's name. Add an A record pointing to the server IP (VPS) or follow the host's DNS instructions. DNS can take up to 24 hours.

## D. Ownership checklist (prevents future trouble)
1. Domain registered in the CLIENT'S name and email.
2. Hosting account created by the CLIENT (you can be added as a user) so renewals go to them.
3. Admin password: log in at /admin, go to **Password**, and change it to one only the client knows.
4. Give the client in writing: site URL, admin URL, hosting login, domain login, and where `data/` and `public/uploads/` live.
5. Set up automatic weekly backups of `data/` and `public/uploads/` (host backup tool, or copy the folders monthly).
6. Agree in writing what happens after handover: free fixes for X days, then paid support. Write who pays for domain and hosting renewal and when.
7. Show the client how to: edit text, swap certificate images, read enquiries, and change the password (15 minute walkthrough).

## E. Client's daily use
Go to `yoursite.com/admin`, log in, pick a tab (Site Details, Stats & Services, Certificates, Enquiries, Password), edit, click **Save Changes**. Changes are live instantly.
**Forgot the password?** Stop the app, delete `data/admin.json`, set a new `ADMIN_PASSWORD`, start again.

## F. Before going live
- Fill phone, WhatsApp, email and Instagram in the admin panel.
- Check the certificate dates (the CPR and AED certificates show validity to 17 Sep 2026; update after renewal).
