import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://yrest-docs.netlify.app",
  integrations: [
    sitemap(),
    starlight({
      title: "yRest",
      description:
        "YAML-powered REST API mock server. Zero-config CRUD, relations, filters, SSE and custom routes from a db.yml file.",
      favicon: "/favicon.ico",
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        es: { label: "Español", lang: "es" },
        de: { label: "Deutsch", lang: "de" },
        fr: { label: "Français", lang: "fr" },
        it: { label: "Italiano", lang: "it" },
      },
      logo: {
        src: "./src/assets/yrest-logo.png",
        alt: "yRest",
        replacesTitle: true,
      },
      components: {
        Header: "./src/components/Header.astro",
      },
      head: [
        // ── LLM discoverability ──────────────────────────────────────────────
        {
          tag: "link",
          attrs: { rel: "llms-txt", href: "/llms.txt" },
        },
        // ── Favicon set ──────────────────────────────────────────────────────
        {
          tag: "link",
          attrs: { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
        },
        {
          tag: "link",
          attrs: { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
        },
        {
          tag: "link",
          attrs: { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        },
        {
          tag: "link",
          attrs: { rel: "manifest", href: "/site.webmanifest" },
        },
        // ── Open Graph image ─────────────────────────────────────────────────
        {
          tag: "meta",
          attrs: { property: "og:image", content: "https://yrest-docs.netlify.app/og-image.png" },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:width", content: "1280" },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:height", content: "640" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:card", content: "summary_large_image" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:image", content: "https://yrest-docs.netlify.app/og-image.png" },
        },
        // ── Structured data (JSON-LD) ─────────────────────────────────────────
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "yRest",
            alternateName: "@yrest/cli",
            description:
              "YAML-powered REST API mock server. Zero-config CRUD, relations, filters, SSE streams and custom routes from a db.yml file.",
            url: "https://yrest-docs.netlify.app",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "All",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            downloadUrl: "https://www.npmjs.com/package/@yrest/cli",
            codeRepository: "https://github.com/aggiovato/yRest",
            license: "https://github.com/aggiovato/yRest/blob/main/LICENSE",
          }),
        },
        // ── Sidebar state restore (must run before paint) ─────────────────────
        {
          tag: "script",
          content:
            "if(localStorage.getItem('yr-sidebar')==='closed')document.documentElement.classList.add('yr-sidebar-closed');",
        },
        {
          tag: "script",
          content: `(function(){
  function patchTocLastItem(){
    const nav=()=>document.querySelector('starlight-toc nav');
    let timer=null;

    function forceLastActive(){
      const n=nav();if(!n)return;
      const all=[...n.querySelectorAll('a')];
      if(!all.length)return;
      // Disconnect observer, fix DOM, reconnect to avoid triggering ourselves
      mo.disconnect();
      all.forEach(a=>a.removeAttribute('aria-current'));
      all[all.length-1].setAttribute('aria-current','true');
      const n2=nav();if(n2)mo.observe(n2,OBS_OPTS);
    }

    const OBS_OPTS={attributes:true,subtree:true,attributeFilter:['aria-current']};
    const mo=new MutationObserver(()=>{
      if(!isAtBottom())return;
      // Let Starlight finish its own mutation handling, then override
      if(timer)clearTimeout(timer);
      timer=setTimeout(forceLastActive,16);
    });

    function isAtBottom(){
      return document.documentElement.scrollHeight-window.scrollY-window.innerHeight<100;
    }

    function onScroll(){
      if(!isAtBottom())return;
      if(timer)clearTimeout(timer);
      timer=setTimeout(forceLastActive,16);
    }

    window.addEventListener('scroll',onScroll,{passive:true});
    const n=nav();if(n)mo.observe(n,OBS_OPTS);
  }
  patchTocLastItem();
  document.addEventListener('astro:page-load',patchTocLastItem);
})();`,
        },
        {
          tag: "link",
          attrs: { rel: "preconnect", href: "https://fonts.googleapis.com" },
        },
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossorigin: "",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap",
          },
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/aggiovato/yRest",
        },
        {
          icon: "npm",
          label: "npm",
          href: "https://www.npmjs.com/package/@yrest/cli",
        },
      ],
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Home",
          translations: { es: "Inicio", de: "Start", fr: "Accueil", it: "Home" },
          link: "/",
        },
        {
          label: "Getting Started",
          translations: {
            es: "Primeros pasos",
            de: "Erste Schritte",
            fr: "Pour commencer",
            it: "Per iniziare",
          },
          items: [
            {
              label: "Introduction",
              translations: {
                es: "Introducción",
                de: "Einführung",
                fr: "Introduction",
                it: "Introduzione",
              },
              slug: "getting-started/introduction",
            },
            {
              label: "Quick Start",
              translations: {
                es: "Inicio rápido",
                de: "Schnellstart",
                fr: "Démarrage rapide",
                it: "Avvio rapido",
              },
              slug: "getting-started/quick-start",
            },
            {
              label: "Configuration",
              translations: {
                es: "Configuración",
                de: "Konfiguration",
                fr: "Configuration",
                it: "Configurazione",
              },
              slug: "getting-started/configuration",
            },
          ],
        },
        {
          label: "Database",
          translations: {
            es: "Base de datos",
            de: "Datenbank",
            fr: "Base de données",
            it: "Database",
          },
          items: [
            {
              label: "yRest Format",
              translations: {
                es: "Formato yRest",
                de: "yRest-Format",
                fr: "Format yRest",
                it: "Formato yRest",
              },
              slug: "database/format",
            },
            {
              label: "Field Schema",
              translations: {
                es: "Esquema de campos",
                de: "Feld-Schema",
                fr: "Schéma de champs",
                it: "Schema dei campi",
              },
              slug: "database/schema",
            },
            {
              label: "Relations",
              translations: {
                es: "Relaciones",
                de: "Relationen",
                fr: "Relations",
                it: "Relazioni",
              },
              slug: "database/relations",
            },
            {
              label: "Query Parameters",
              translations: {
                es: "Parámetros de consulta",
                de: "Abfrageparameter",
                fr: "Paramètres de requête",
                it: "Parametri di query",
              },
              slug: "database/query-params",
            },
          ],
        },
        {
          label: "Custom Routes",
          translations: {
            es: "Rutas personalizadas",
            de: "Benutzerdefinierte Routen",
            fr: "Routes personnalisées",
            it: "Route personalizzate",
          },
          items: [
            {
              label: "Static Routes",
              translations: {
                es: "Rutas estáticas",
                de: "Statische Routen",
                fr: "Routes statiques",
                it: "Route statiche",
              },
              slug: "routes/static",
            },
            {
              label: "Template Variables",
              translations: {
                es: "Variables de plantilla",
                de: "Template-Variablen",
                fr: "Variables de modèle",
                it: "Variabili di template",
              },
              slug: "routes/templates",
            },
            {
              label: "Scenarios",
              translations: { es: "Escenarios", de: "Szenarien", fr: "Scénarios", it: "Scenari" },
              slug: "routes/scenarios",
            },
            {
              label: "Handler Functions",
              translations: {
                es: "Funciones handler",
                de: "Handler-Funktionen",
                fr: "Fonctions handler",
                it: "Funzioni handler",
              },
              slug: "routes/handlers",
            },
            {
              label: "SSE Streams",
              translations: {
                es: "Flujos SSE",
                de: "SSE-Streams",
                fr: "Flux SSE",
                it: "Stream SSE",
              },
              slug: "routes/sse",
              badge: { text: "NEW", variant: "success" },
            },
            {
              label: "WebSocket",
              translations: { es: "WebSocket", de: "WebSocket", fr: "WebSocket", it: "WebSocket" },
              slug: "routes/websocket",
              badge: { text: "SOON", variant: "caution" },
            },
          ],
        },
        {
          label: "Server",
          translations: { es: "Servidor", de: "Server", fr: "Serveur", it: "Server" },
          items: [
            {
              label: "Server Modes",
              translations: {
                es: "Modos de servidor",
                de: "Server-Modi",
                fr: "Modes serveur",
                it: "Modalità server",
              },
              slug: "reference/server-modes",
            },
          ],
        },
        {
          label: "API & CLI",
          translations: { es: "API & CLI", de: "API & CLI", fr: "API & CLI", it: "API & CLI" },
          items: [
            {
              label: "Programmatic API",
              translations: {
                es: "API programática",
                de: "Programmatische API",
                fr: "API programmatique",
                it: "API programmatica",
              },
              slug: "reference/programmatic-api",
            },
            {
              label: "CLI Reference",
              translations: {
                es: "Referencia CLI",
                de: "CLI-Referenz",
                fr: "Référence CLI",
                it: "Riferimento CLI",
              },
              slug: "reference/cli-reference",
            },
          ],
        },
        {
          label: "Integrations",
          translations: {
            es: "Integraciones",
            de: "Integrationen",
            fr: "Intégrations",
            it: "Integrazioni",
          },
          items: [
            {
              label: "OpenAPI Export",
              translations: {
                es: "Exportación OpenAPI",
                de: "OpenAPI-Export",
                fr: "Export OpenAPI",
                it: "Export OpenAPI",
              },
              slug: "integrations/openapi",
            },
          ],
        },
        {
          label: "Playground",
          translations: {
            es: "Playground",
            de: "Playground",
            fr: "Playground",
            it: "Playground",
          },
          link: "/playground/",
          badge: { text: "NEW", variant: "success" },
        },
      ],
    }),
  ],
});
