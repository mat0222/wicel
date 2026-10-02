# wicel

Tienda online y panel de administración de wicel (Villa del Rosario, Córdoba).

## Carpetas

```
api/                 API en PHP
  index.php          todas las rutas /api/...
  src/               lógica: cuentas, catálogo, pedidos, canjes, legal, seguridad, emails
  uploads/           fotos que se suben desde el panel (no se guardan en git)
  config.example.php copiar como config.php y completar
database/wicel.sql   base MySQL completa: se importa en una base vacía
public/              archivos estáticos (logo, banner, fotos de ejemplo, .htaccess)
scripts/             ayuda para desarrollo (levanta Docker al hacer npm run dev)
src/                 tienda y panel en React
  components/        piezas compartidas: encabezado, pie, ventanas de producto
  lib/               datos, llamadas a la API, textos legales, datos del local
  pages/tienda/      páginas que ve el cliente
  pages/admin/       panel del dueño
```

Los archivos sueltos en la raíz (`package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `index.html`, `docker-compose.yml`) tienen que estar ahí: Node, Vite, TypeScript y Docker los buscan en la raíz.

## Desarrollo

1. MySQL 8 con una base `wicel` vacía, importando `database/wicel.sql`.
2. Copiar `api/config.example.php` a `api/config.php` y completar los datos.
3. `npm install` y después `npm run dev`. Abre Docker con la API y la tienda en http://localhost:5173.

Crear un administrador:

```
docker exec proyecto-wicel-api-1 php src/crear-admin.php email@ejemplo.com "ContraseñaLarga123" "Nombre"
```

## Publicar

`npm run build` genera `dist/`. Subir el contenido de `dist/` y la carpeta `api/` (con su `config.php`) al hosting.
