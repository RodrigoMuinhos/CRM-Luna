// Health check endpoint for Docker
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() }, { status: 200 });
}
