import { NextRequest, NextResponse } from 'next/server';
import { 
  getCustomerInvoices, 
  getInvoice, 
  getInvoicePdfUrl,
  getCustomerByUserId 
} from '@/lib/payments/stripe-enhanced';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/payments/invoices
 * Get invoices for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const startingAfter = searchParams.get('startingAfter') || undefined;
    const invoiceId = searchParams.get('invoiceId');

    // If specific invoice requested
    if (invoiceId) {
      const invoice = await getInvoice(invoiceId);
      
      // Verify the invoice belongs to the user
      const customer = await getCustomerByUserId(session.user.id);
      if (!customer || invoice.customer !== customer.id) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Get PDF URL if available
      const pdfUrl = await getInvoicePdfUrl(invoiceId);

      return NextResponse.json({
        invoice: {
          id: invoice.id,
          number: invoice.number,
          status: invoice.status,
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          created: invoice.created,
          due_date: invoice.due_date,
          paid_at: invoice.status_transitions?.paid_at,
          pdf_url: pdfUrl,
          hosted_invoice_url: invoice.hosted_invoice_url,
          lines: invoice.lines?.data.map(line => ({
            description: line.description,
            amount: line.amount,
            quantity: line.quantity,
            price: line.price,
          })),
        },
      });
    }

    // Get customer
    const customer = await getCustomerByUserId(session.user.id);
    
    if (!customer) {
      return NextResponse.json({
        invoices: [],
        has_more: false,
      });
    }

    // Get invoices list
    const invoices = await getCustomerInvoices({
      customerId: customer.id,
      limit,
      startingAfter,
    });

    // Format invoices for response
    const formattedInvoices = await Promise.all(
      invoices.data.map(async (invoice) => {
        const pdfUrl = await getInvoicePdfUrl(invoice.id);
        return {
          id: invoice.id,
          number: invoice.number,
          status: invoice.status,
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          created: invoice.created,
          due_date: invoice.due_date,
          paid_at: invoice.status_transitions?.paid_at,
          pdf_url: pdfUrl,
          hosted_invoice_url: invoice.hosted_invoice_url,
          description: invoice.description,
          period_start: invoice.period_start,
          period_end: invoice.period_end,
        };
      })
    );

    return NextResponse.json({
      invoices: formattedInvoices,
      has_more: invoices.has_more,
      next_cursor: invoices.data.length > 0 
        ? invoices.data[invoices.data.length - 1].id 
        : null,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/invoices/send
 * Send an invoice via email
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Get the invoice
    const invoice = await getInvoice(invoiceId);
    
    // Verify the invoice belongs to the user
    const customer = await getCustomerByUserId(session.user.id);
    if (!customer || invoice.customer !== customer.id) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Send the invoice
    const { sendInvoice } = await import('@/lib/payments/stripe-enhanced');
    const sentInvoice = await sendInvoice(invoiceId);

    return NextResponse.json({
      success: true,
      message: 'Invoice sent successfully',
      invoice_id: sentInvoice.id,
    });
  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}