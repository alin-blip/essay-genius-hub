// Returns a PNG (base64 data URL) for a Chart.js config rendered via QuickChart.io
// No API key required. Used by the assignment editor + exports.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChartRequest {
  type: "bar" | "line" | "pie" | "doughnut" | "radar" | "polarArea";
  title?: string;
  labels: string[];
  datasets: Array<{ label?: string; data: number[]; backgroundColor?: string | string[] }>;
  width?: number;
  height?: number;
}

const PALETTE = ["#1a365d", "#d4a843", "#2c5f2d", "#b85042", "#6d2e46", "#028090", "#84b59f"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ChartRequest;
    const { type, title, labels, datasets, width = 700, height = 400 } = body;

    if (!type || !Array.isArray(labels) || !Array.isArray(datasets)) {
      return new Response(JSON.stringify({ error: "Invalid chart payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply palette colors if not provided
    const coloredDatasets = datasets.map((ds, i) => ({
      ...ds,
      backgroundColor:
        ds.backgroundColor ??
        (type === "pie" || type === "doughnut" || type === "polarArea"
          ? PALETTE.slice(0, ds.data.length)
          : PALETTE[i % PALETTE.length]),
      borderColor: type === "line" ? PALETTE[i % PALETTE.length] : undefined,
      borderWidth: type === "line" ? 2 : 1,
      fill: type === "line" ? false : undefined,
    }));

    const chartConfig = {
      type,
      data: { labels, datasets: coloredDatasets },
      options: {
        plugins: {
          title: title ? { display: true, text: title, font: { size: 16, weight: "bold" } } : { display: false },
          legend: { display: datasets.length > 1 || type === "pie" || type === "doughnut" || type === "polarArea" },
        },
        scales:
          type === "bar" || type === "line"
            ? { y: { beginAtZero: true } }
            : undefined,
      },
    };

    const url = `https://quickchart.io/chart?w=${width}&h=${height}&bkg=white&c=${encodeURIComponent(
      JSON.stringify(chartConfig),
    )}`;

    const r = await fetch(url);
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `Chart service ${r.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    // base64 encode
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const dataUrl = `data:image/png;base64,${btoa(bin)}`;

    return new Response(JSON.stringify({ data_url: dataUrl, width, height }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-chart error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
