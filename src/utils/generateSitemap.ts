import { supabase } from "../lib/supabase";

export interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
}

export async function generateSitemap(): Promise<string> {
  const baseUrl = "https://omnipply.com";
  const currentDate = new Date().toISOString().split("T")[0];

  const urls: SitemapUrl[] = [
    // Main pages
    {
      loc: `${baseUrl}/`,
      lastmod: currentDate,
      changefreq: "weekly",
      priority: 1.0,
    },
    {
      loc: `${baseUrl}/features`,
      lastmod: currentDate,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${baseUrl}/dashboard`,
      lastmod: currentDate,
      changefreq: "daily",
      priority: 0.6,
    },
    {
      loc: `${baseUrl}/profile`,
      lastmod: currentDate,
      changefreq: "monthly",
      priority: 0.5,
    },
    {
      loc: `${baseUrl}/my-submissions`,
      lastmod: currentDate,
      changefreq: "weekly",
      priority: 0.5,
    },
  ];

  try {
    // Get all organizations
    const { data: orgs } = await supabase
      .from("organizations")
      .select("slug")
      .eq("published", true);

    if (orgs) {
      orgs.forEach((org) => {
        urls.push({
          loc: `${baseUrl}/org/${org.slug}`,
          lastmod: currentDate,
          changefreq: "weekly",
          priority: 0.7,
        });
      });
    }

    // Get all coalitions
    const { data: coalitions } = await supabase
      .from("coalitions")
      .select("slug");

    if (coalitions) {
      coalitions.forEach((coalition) => {
        urls.push({
          loc: `${baseUrl}/coalitions/${coalition.slug}`,
          lastmod: currentDate,
          changefreq: "weekly",
          priority: 0.7,
        });
      });
    }

    // Get all published programs
    const { data: programs } = await supabase
      .from("programs")
      .select("id")
      .eq("published", true);

    if (programs) {
      programs.forEach((program) => {
        urls.push({
          loc: `${baseUrl}/programs/${program.id}`,
          lastmod: currentDate,
          changefreq: "weekly",
          priority: 0.7,
        });
        urls.push({
          loc: `${baseUrl}/programs/${program.id}/apply`,
          lastmod: currentDate,
          changefreq: "weekly",
          priority: 0.6,
        });
      });
    }
  } catch (error) {
    console.error("Error generating sitemap:", error);
  }

  // Generate XML
  const xmlHeader =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const xmlFooter = "</urlset>";

  const urlEntries = urls
    .map(
      (url) =>
        `  <url>\n    <loc>${url.loc}</loc>\n    <lastmod>${url.lastmod}</lastmod>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`
    )
    .join("\n");

  return xmlHeader + urlEntries + "\n" + xmlFooter;
}

// Function to save sitemap to file (for server-side generation)
export async function saveSitemapToFile(filePath: string): Promise<void> {
  const sitemapXml = await generateSitemap();
  // This would be used in a Node.js environment to write to file
  // For now, you can copy the output and save it manually
  console.log("Generated sitemap:");
  console.log(sitemapXml);
}
