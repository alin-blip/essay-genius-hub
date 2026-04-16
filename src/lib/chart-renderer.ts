import { supabase } from "@/integrations/supabase/client";
import type { ChartSpec } from "./markdown-blocks";

export interface RenderedChart {
  spec: ChartSpec;
  data_url: string; // data:image/png;base64,...
  width: number;
  height: number;
}

/**
 * Fetch PNG renderings for a list of chart specs in parallel.
 * Failures are skipped (returned list may be shorter than input).
 */
export async function renderCharts(specs: ChartSpec[]): Promise<RenderedChart[]> {
  if (specs.length === 0) return [];
  const results = await Promise.allSettled(
    specs.map((spec) =>
      supabase.functions
        .invoke("generate-chart", { body: spec })
        .then(({ data, error }) => {
          if (error || !data?.data_url) throw error || new Error("No chart data");
          return { spec, data_url: data.data_url as string, width: data.width, height: data.height };
        }),
    ),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<RenderedChart> => r.status === "fulfilled")
    .map((r) => r.value);
}

/**
 * Convert a data URL → ArrayBuffer for docx ImageRun.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
