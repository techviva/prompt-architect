import { NextRequest, NextResponse } from "next/server";
import { getRequest, deleteRequest } from "@/lib/adapters/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const request = getRequest(id);

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...request,
      parentRequest: null,
      childRequests: [],
      tags: [],
    });
  } catch (error) {
    console.error("Error fetching request:", error);
    return NextResponse.json({ error: "Failed to fetch request" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deleteRequest(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
  }
}
