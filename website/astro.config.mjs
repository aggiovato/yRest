import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "yRest",
      description:
        "YAML-powered REST API mock server. Zero-config CRUD, relations, filters, SSE and custom routes from a db.yml file.",
      logo: {
        src: "./src/assets/yrest-logo.png",
        alt: "yRest",
        replacesTitle: true,
      },
      components: {
        Header: "./src/components/Header.astro",
      },
      head: [
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
      editLink: {
        baseUrl: "https://github.com/aggiovato/yRest/edit/main/website/",
      },
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        { label: "Home", link: "/" },
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "introduction" },
            { label: "Quick Start", slug: "quick-start" },
            { label: "Configuration", slug: "configuration" },
          ],
        },
        {
          label: "Database",
          items: [
            { label: "YAML Format", slug: "database/format" },
            { label: "Field Schema", slug: "database/schema" },
            { label: "Relations", slug: "database/relations" },
          ],
        },
        {
          label: "Custom Routes",
          items: [
            { label: "Static & Templates", slug: "routes/static" },
            { label: "Scenarios", slug: "routes/scenarios" },
            { label: "Handler Functions", slug: "routes/handlers" },
            {
              label: "SSE Streams",
              slug: "routes/sse",
              badge: { text: "NEW", variant: "success" },
            },
          ],
        },
        {
          label: "Query Parameters",
          slug: "query-params",
        },
        {
          label: "Server Modes",
          slug: "server-modes",
        },
        {
          label: "Programmatic API",
          slug: "programmatic-api",
        },
        {
          label: "CLI Reference",
          slug: "cli-reference",
        },
      ],
    }),
  ],
});
