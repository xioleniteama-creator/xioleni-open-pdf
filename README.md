# Xioleni Open PDF

Aplicación para editar documentos PDF desde una aplicación de escritorio en Windows o desde un sitio web. Ambas versiones usan el mismo editor, los mismos recursos y el mismo procesamiento local: **los documentos seleccionados en el navegador no se suben al servidor web**.

## Entregables separados

Al ejecutar `npm run build:folders`, se preparan dos carpetas independientes en la raíz:

- **`Xioleni Open PDF - Escritorio`**: aplicación Electron, menú nativo, icono de Windows, selección de archivos local, confirmación antes de sobrescribir el documento original y código necesario para generar el instalador.
- **`Xioleni Open PDF - Online`**: versión web estática autónoma, con `index.html`, recursos locales, manifiesto PWA, acceso sin conexión y `robots.txt`. **La raíz de esta carpeta** es la que se sube al servicio de alojamiento; no se necesita instalar Node.js en el servidor.

Las versiones se construyen desde los archivos fuente de este proyecto. Puedes reconstruir las dos carpetas sin instalar dependencias:

```powershell
npm run build:folders
```

## Versión de escritorio para Windows

Instala el instalador de Windows con:

```powershell
npm run desktop:build
```

El comando prepara las dos carpetas, descarga las herramientas de construcción necesarias si hacen falta y genera el instalador x64:

`Xioleni Open PDF - Escritorio\instalador\Xioleni-Open-PDF-Setup-1.0.0.exe`

Necesitas Node.js 22 o posterior y una conexión a Internet la primera vez que se descargan Electron y las herramientas del instalador. El paquete instalable no incluye la conexión a tu equipo durante su uso: una vez instalado, el programa abre y edita los PDF localmente sin Internet.

Para iniciar la versión de escritorio sin crear el instalador:

```powershell
npm run build:folders
npm run desktop:install
npm run desktop
```

La aplicación de escritorio incluye los menús Archivo, Editar y Vista; atajos de teclado; abrir, guardar y exportar archivos con los cuadros nativos de Windows, e instalación con accesos directos en el menú Inicio y en el escritorio.

## Versión web

Para reconstruir y probar el sitio en tu equipo:

```powershell
npm run build:folders
npm run web
```

Abre <http://127.0.0.1:4173>. El servidor local usa Node.js integrado, tiene las dependencias PDF incluidas en `vendor` y no hace solicitudes a servicios externos. La misma carpeta web se puede publicar como un sitio estático en un proveedor HTTPS.

La web también incluye metadatos para buscadores, un manifiesto para instalarla como aplicación web, caché para abrirla sin conexión y reglas `robots.txt` que permiten el rastreo. **No se puede incluir un sitemap ni una URL canónica válida sin conocer el dominio en el que se publicará la web.** Una vez publicado el sitio, facilita la URL pública para añadir su dominio canónico, generar un sitemap con la dirección correcta y registrar el sitio en Google Search Console y Bing Webmaster Tools. Que una página permita el rastreo no garantiza que un buscador la indexe.

## Herramientas de edición

- Abrir PDF local, vista previa, navegación y miniaturas de páginas.
- Seleccionar bloques de texto, colocar texto nuevo y corregir el texto con tamaño, color y negrita.
- Seleccionar regiones para cubrir el contenido, añadir imágenes o reemplazar una región con una imagen.
- Insertar páginas en blanco o importar páginas de otro PDF; reorganizar, rotar y eliminar páginas.
- Ajustar el zoom, deshacer y rehacer cambios, guardar el documento o exportar otra copia.

## Limitación importante

El editor coloca contenido PDF nuevo por encima del contenido existente. Al corregir o cubrir un área, el original puede seguir incrustado, extraíble o buscable en el PDF. **No uses la opción de cubrir texto o regiones para redactar datos confidenciales.**

## Bibliotecas y licencias incluidas

- PDF.js 3.11.174, Mozilla Foundation, licencia Apache 2.0: `vendor/PDFJS-LICENSE.txt`.
- pdf-lib 1.17.1, licencia MIT: `vendor/PDFLIB-LICENSE.md`.
- El código fuente del proyecto se publica bajo la licencia MIT de `LICENSE`.
- El logotipo y sus variantes son propiedad de Xioleni Salazar; su uso queda reservado de acuerdo con `LICENSE-LOGO.txt`.
- El logo de la aplicación proviene del archivo entregado `Logo PDF 3D con icono X independiente-01.png`. Los iconos de Windows y de la aplicación web conservan su transparencia.

## Repositorio público y compilación automatizada

El código fuente se publica en [GitHub](https://github.com/xioleniteama-creator/xioleni-open-pdf). La licencia MIT se aplica al código, no al logotipo, las imágenes de marca ni a las dependencias con sus propias licencias.

La configuración local `.github/workflows/build-windows.yml` compila el instalador x64 al crear una etiqueta `v*` o al ejecutarlo manualmente. El repositorio de GitHub puede compilar y publicar el código fuente sin esa configuración. GitHub exige el permiso OAuth adicional `workflow` para subir o cambiar archivos de acciones; no sustituyas este requisito por credenciales de firma inventadas.

## Certificado gratuito de OSSign

OSSign ofrece firma de ejecutables para acciones de GitHub mediante su servidor de firma sin claves privadas en el repositorio. La aplicación usa la acción oficial `OSSign/OSSign@1.4.1` y restringe `id-token: write` al trabajo de firma.

La acción de firma está deshabilitada de forma segura hasta que OSSign autorice una clave para el repositorio. Cuando tengas esa autorización, configura `OSSIGN_TRUSTED_SIGNING_ENABLED=true` y `OSSIGN_TRUSTED_SIGNING_KEY` en las variables del repositorio de GitHub. Sin una clave que OSSign haya asignado y autorizado para el repositorio, el flujo conserva un artefacto identificado explícitamente como `sin-firma` y no afirma que la aplicación esté firmada. OSSign publica un control de disponibilidad en `https://signer.ossign.org/healthz`; ese control no emite certificados ni sustituye la aprobación de la clave. Esta configuración no utiliza el ejemplo `ossign/code-signing-action@v1` ni crea un secreto inventado `OSSIGN_TOKEN`.
