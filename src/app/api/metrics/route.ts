import { NextResponse } from "next/server";
import { getMetricsData } from "@/actions/metricActions";

export async function GET() {
  try {
    const metrics = await getMetricsData();
    return NextResponse.json(metrics);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
