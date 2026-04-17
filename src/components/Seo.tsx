import { useEffect } from "react";

interface SeoProps {
  title: string;
  description: string;
  path: string; // route path beginning with "/"
  noIndex?: boolean;
}

const SITE_URL = "https://myunipal.io";

/** Upsert a <meta> tag by attribute key/value pair, setting its content. */
function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const Seo = ({ title, description, path, noIndex = false }: SeoProps) => {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;

    setMeta("name", "description", description);
    setCanonical(url);
    setMeta("name", "robots", noIndex ? "noindex,nofollow" : "index,follow");

    // Open Graph
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", url);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
  }, [title, description, path, noIndex]);

  return null;
};

export default Seo;
