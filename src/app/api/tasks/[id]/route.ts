import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';
import { parseAndValidate, taskSchema, ValidationError } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = await request.json();
    
    // Server-side validation using Zod
    const validatedData = parseAndValidate(taskSchema, body, 'Task Update');
    
    const task = await kernel.mutate('tasks', 'UPDATE', validatedData, { id: params.id });
    return NextResponse.json({ data: task });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, details: error.field }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
