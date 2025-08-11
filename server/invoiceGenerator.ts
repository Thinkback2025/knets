import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  userName: string;
  userEmail: string;
  userMobile: string;
  subscriptionFee: number;
  gstNumber?: string;
}

export class InvoiceGenerator {
  private sesClient?: SESClient;

  constructor() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
      console.warn("AWS credentials not found - invoice emails will not be sent");
      return;
    }
    
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  generateInvoiceHTML(data: InvoiceData): string {
    // Calculate base amount (excluding tax) from total amount
    const baseAmount = (data.subscriptionFee / 1.18).toFixed(2);
    const sgstAmount = (parseFloat(baseAmount) * 0.09).toFixed(2);
    const cgstAmount = (parseFloat(baseAmount) * 0.09).toFixed(2);
    const totalAmount = data.subscriptionFee.toFixed(2);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${data.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 28px; font-weight: bold; color: #1e40af; margin-bottom: 10px; }
          .gst-number { font-size: 14px; color: #6b7280; }
          .invoice-details { margin-bottom: 20px; }
          .bill-to-section { margin-bottom: 30px; }
          .invoice-info { background: #f8fafc; padding: 15px; border-radius: 6px; }
          .invoice-info h3 { margin: 0 0 10px 0; color: #374151; }
          .content { margin-bottom: 30px; }
          .payment-description { font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 20px; }
          .amount-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .amount-table th, .amount-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          .amount-table th { background: #f9fafb; font-weight: 600; color: #374151; }
          .amount-table .total-row { background: #f0f9ff; font-weight: bold; }
          .amount-table .total-row td { border-top: 2px solid #2563eb; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .footer p { color: #6b7280; font-size: 14px; margin: 5px 0; }
          .thank-you { color: #059669; font-weight: 600; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-name">Thinkback Technologies</div>
            <div class="gst-number">GST No: ${data.gstNumber || '_______________'}</div>
          </div>
          
          <div class="invoice-details">
            <div class="invoice-info">
              <h3>Invoice Details</h3>
              <p><strong>Date:</strong> ${data.invoiceDate}</p>
              <p><strong>Invoice No:</strong> ${data.invoiceNumber}</p>
            </div>
          </div>
          
          <div class="bill-to-section">
            <div class="invoice-info">
              <h3>Bill To</h3>
              <p><strong>${data.userName}</strong></p>
              <p>Email: ${data.userEmail}</p>
              <p>Mobile: ${data.userMobile}</p>
            </div>
          </div>
          
          <div class="content">
            <div class="payment-description">
              Received payment from <strong>${data.userName}</strong> towards the subscription fee for Knets app
            </div>
            
            <table class="amount-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Rate (%)</th>
                  <th>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Subscription Fee</td>
                  <td>-</td>
                  <td>₹${baseAmount}</td>
                </tr>
                <tr>
                  <td>SGST Tax</td>
                  <td>9%</td>
                  <td>₹${sgstAmount}</td>
                </tr>
                <tr>
                  <td>CGST Tax</td>
                  <td>9%</td>
                  <td>₹${cgstAmount}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2"><strong>Total Amount</strong></td>
                  <td><strong>₹${totalAmount}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="footer">
            <p class="thank-you">Thank you for your subscription to Knets!</p>
            <p>This is a system-generated invoice for your payment confirmation.</p>
            <p>For any queries, please contact our support team.</p>
            <p><strong>Thinkback Technologies</strong> | Email: support@knets.app</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async generateInvoiceNumber(paymentType: 'subscription' | 'child_upgrade'): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const yearMonth = `${year}${month}`;
    
    // Determine invoice prefix based on payment type
    const prefix = paymentType === 'subscription' ? 'INVKNETSSUB' : 'INVKNETSADD';
    
    // Retry logic for handling race conditions
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      try {
        // Get the next sequential number for this month/year and payment type
        const sequentialNumber = await this.getNextInvoiceSequence(yearMonth, paymentType);
        const invoiceNumber = `${prefix}${yearMonth}${sequentialNumber}`;
        
        // Check if this invoice number already exists
        const { db } = await import('./db');
        const { invoices } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');
        
        const existing = await db
          .select({ id: invoices.id })
          .from(invoices)
          .where(eq(invoices.invoiceNumber, invoiceNumber))
          .limit(1);
        
        if (existing.length === 0) {
          return invoiceNumber;
        }
        
        // If duplicate found, increment attempt and try again
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 50 * attempts));
        
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 100 * attempts));
      }
    }
    
    // Fallback with timestamp if all attempts fail
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${yearMonth}${timestamp}`;
  }

  private async getNextInvoiceSequence(yearMonth: string, paymentType: 'subscription' | 'child_upgrade'): Promise<string> {
    // Import db here to avoid circular dependencies
    const { db } = await import('./db');
    const { invoices } = await import('@shared/schema');
    const { like } = await import('drizzle-orm');
    
    // Determine prefix based on payment type
    const prefix = paymentType === 'subscription' ? 'INVKNETSSUB' : 'INVKNETSADD';
    
    // Get all invoices for this year-month and payment type
    const pattern = `${prefix}${yearMonth}%`;
    const results = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(like(invoices.invoiceNumber, pattern));
    
    // Extract sequence numbers and find the maximum
    let maxSequence = 0;
    // Updated regex to handle variable-length sequence numbers (4 or 5 digits)
    const regex = new RegExp(`^${prefix}${yearMonth}(\\d{4,5})$`);
    
    for (const invoice of results) {
      const match = invoice.invoiceNumber.match(regex);
      if (match) {
        const sequenceNum = parseInt(match[1]);
        if (sequenceNum > maxSequence) {
          maxSequence = sequenceNum;
        }
      }
    }
    
    // Add small random offset to handle concurrent requests
    const randomOffset = Math.floor(Math.random() * 3); // 0, 1, or 2
    const nextNumber = maxSequence + 1 + randomOffset;
    
    // Handle edge case: if sequence exceeds 9999, use 5 digits
    if (nextNumber > 9999) {
      return nextNumber.toString().padStart(5, '0');
    }
    
    return nextNumber.toString().padStart(4, '0');
  }

  async sendInvoiceEmail(data: InvoiceData): Promise<boolean> {
    if (!this.sesClient) {
      console.warn("Amazon SES not configured - invoice email not sent");
      return false;
    }

    try {
      const htmlContent = this.generateInvoiceHTML(data);
      const textContent = `Invoice ${data.invoiceNumber}\n\nThinkback Technologies\nGST No: ${data.gstNumber || '_______________'}\n\nDate: ${data.invoiceDate}\nReceived payment from ${data.userName} towards subscription fee for Knets app\n\nSubscription Fee: ₹${data.subscriptionFee.toFixed(2)}\nSGST Tax (9%): ₹${(data.subscriptionFee * 0.09).toFixed(2)}\nCGST Tax (9%): ₹${(data.subscriptionFee * 0.09).toFixed(2)}\nTotal: ₹${(data.subscriptionFee * 1.18).toFixed(2)}\n\nThank you for your subscription!`;
      
      const command = new SendEmailCommand({
        Source: process.env.SES_FROM_EMAIL || 'noreply@knets.app',
        Destination: {
          ToAddresses: [data.userEmail],
        },
        Message: {
          Subject: {
            Data: `Invoice ${data.invoiceNumber} - Knets Subscription`,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textContent,
              Charset: 'UTF-8',
            },
          },
        },
      });

      await this.sesClient.send(command);
      console.log(`✅ Invoice ${data.invoiceNumber} sent to ${data.userEmail} via Amazon SES`);
      return true;
    } catch (error) {
      console.error('Failed to send invoice email via Amazon SES:', error);
      return false;
    }
  }

  async generateAndSendInvoice(userName: string, userEmail: string, subscriptionFee: number = 2, gstNumber?: string, paymentType: 'subscription' | 'child_upgrade' = 'subscription'): Promise<string> {
    const invoiceNumber = await this.generateInvoiceNumber(paymentType);
    const invoiceDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate,
      userName,
      userEmail,
      userMobile: 'Not provided',
      subscriptionFee,
      gstNumber
    };

    await this.sendInvoiceEmail(invoiceData);
    return invoiceNumber;
  }
}

export const invoiceGenerator = new InvoiceGenerator();