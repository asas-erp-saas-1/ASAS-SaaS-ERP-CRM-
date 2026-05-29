import { NextResponse } from 'next/server';
import { DealService } from '@/services/deals/deal.service';
import { ErrorTracker } from '@/lib/observability/errors';
import { parseAndValidate, dealSchema, ValidationError } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 25;
    const id = searchParams.get('id');
    
    const deals = await DealService.getDeals();
    
    if (id) {
       const deal = deals.find(d => d.id === id);
       return NextResponse.json({ data: deal ? [deal] : [], count: deal ? 1 : 0 });
    }
    
    return NextResponse.json({ data: deals, count: deals.length });
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'GET /api/deals' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const validatedData = parseAndValidate(dealSchema, body, 'Deal Create');

    const deal = await DealService.createDeal({
      clientId: validatedData.client_id,
      propertyId: validatedData.property_id,
      agreedPrice: validatedData.agreed_price,
      dealType: validatedData.deal_type,
    });
    return NextResponse.json({ data: deal });
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'POST /api/deals' });
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, details: error.field }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
