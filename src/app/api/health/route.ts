import { NextResponse } from "next/server";
import { prisma } from "@/core/db/prisma";

export async function GET() {
  try {
    await prisma.$connect();
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
