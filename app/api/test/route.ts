import { NextResponse } from "next/server"

export async function GET() {
  console.log("[v0] Test API route called")
  return NextResponse.json({ message: "Test API route working" })
}

export async function POST() {
  console.log("[v0] Test API POST route called")
  return NextResponse.json({ message: "Test API POST route working" })
}
