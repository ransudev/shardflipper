import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCatalogShortId } from "@/lib/fusionCatalog";

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;",
  })[character] ?? character);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const internalId = decodeURIComponent(id).slice(0, 80);
  const shortId = getCatalogShortId(internalId);

  if (shortId) {
    try {
      const icon = await readFile(path.join(
        process.cwd(),
        "reference",
        "SkyShards-master",
        "public",
        "shardIcons",
        `${shortId}.png`,
      ));
      return new Response(new Uint8Array(icon), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    } catch {
      // The generated crystal below is the safe fallback for missing catalog art.
    }
  }

  const safeId = escapeXml(internalId);
  const seed = hash(safeId);
  const hue = seed % 55 + 92;
  const accent = (hue + 32) % 360;
  const facet = seed % 3;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${safeId} shard">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 78% 68%)"/><stop offset="1" stop-color="hsl(${accent} 66% 38%)"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".35"/></filter></defs>
    <path filter="url(#s)" fill="url(#g)" stroke="hsl(${hue} 80% 86%)" stroke-width="1.5" d="M32 3 55 19 49 49 32 61 15 49 9 19Z"/>
    <path fill="hsl(${hue} 82% 82% / .62)" d="M32 3 31 33 9 19Z"/><path fill="hsl(${accent} 72% 22% / .46)" d="M31 33 49 49 32 61Z"/>
    <path fill="none" stroke="white" stroke-opacity=".32" d="M9 19 31 33 55 19M31 33 15 49M31 33 49 49"/>
    ${facet === 0 ? '<circle cx="31" cy="32" r="4" fill="white" fill-opacity=".36"/>' : facet === 1 ? '<path d="m27 31 4-7 4 7-4 7Z" fill="white" fill-opacity=".38"/>' : '<path d="m25 33 6-8 7 8-7 6Z" fill="white" fill-opacity=".34"/>'}
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
