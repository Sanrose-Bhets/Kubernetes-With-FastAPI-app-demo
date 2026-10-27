FROM nginx:alpine

COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY static/ /usr/share/nginx/html/

EXPOSE 80
 