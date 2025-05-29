import { NextResponse } from "next/server"
import puppeteer from "puppeteer"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { userName, userEmail, ndaHtml } = await request.json()

    // Generate PDF from HTML
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()

    // Set viewport size
    await page.setViewport({
      width: 1200,
      height: 1600
    })

    // Inject user name into HTML template
    const personalizedHtml = ndaHtml.replace(/{{userName}}/g, userName)
    
    // Set content and wait for network idle
    await page.setContent(personalizedHtml, {
      waitUntil: 'networkidle0'
    })

    // Generate PDF with specific options
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%; padding: 10px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
    })

    await browser.close()

    // Convert to base64 for email attachment
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

    // Send email with PDF attachment
    const emailResponse = await resend.emails.send({
      from: "Dr. Info <noreply@drinfo.ai>",
      to: userEmail,
      subject: "Your Signed NDA Document",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Your NDA Document</h2>
          <p>Dear ${userName},</p>
          <p>Thank you for completing the registration process. Please find your signed Non-Disclosure Agreement attached to this email.</p>
          <p>Best regards,<br>Dr. Info Team</p>
        </div>
      `,
      attachments: [
        {
          content: pdfBase64,
          filename: `NDA-${userName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        }
      ]
    })

    if (!emailResponse) {
      throw new Error('Failed to send email')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending NDA:", error)
    return NextResponse.json(
      { error: "Failed to send NDA" },
      { status: 500 }
    )
  }
} 