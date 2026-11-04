# Tiny static server image for Fly.io (also works anywhere Docker runs).
# nginx-unprivileged runs as the non-root "nginx" user (uid 101) and listens
# on 8080, so the container needs no capabilities and works with a read-only
# root filesystem plus a tmpfs on /tmp. Pinned to a release line; bump deliberately.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# only what the browser needs — no scripts/, no build parts, no .git (see .dockerignore)
COPY index.html /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY data /usr/share/nginx/html/data
EXPOSE 8080
