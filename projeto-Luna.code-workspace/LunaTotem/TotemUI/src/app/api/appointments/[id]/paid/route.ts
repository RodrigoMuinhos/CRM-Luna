import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Local fallback store used in dev/serverless situations.
// This route supports toggling payment state without requiring a full appointment update.

function getDataPath() {
  // Use /tmp in serverless, otherwise use local project data folder.
  const tmp = process.env.TMPDIR || process.env.TEMP || process.env.TMP;
  if (tmp) return path.join(tmp, 'appointments.json');
  return path.join(process.cwd(), 'data', 'appointments.json');
}

async function readAppointments() {
  const filePath = getDataPath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAppointments(appointments: any[]) {
  const filePath = getDataPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(appointments, null, 2), 'utf8');
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({} as any));

  if (typeof body?.paid !== 'boolean') {
    return NextResponse.json({ error: "Field 'paid' must be boolean" }, { status: 400 });
  }

  const appointments = await readAppointments();
  const index = appointments.findIndex((a: any) => String(a?.id) === String(id));
  if (index < 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  appointments[index] = { ...appointments[index], paid: body.paid };
  await writeAppointments(appointments);

  return NextResponse.json(appointments[index]);
}
