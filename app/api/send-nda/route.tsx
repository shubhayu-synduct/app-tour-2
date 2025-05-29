import { NextResponse } from "next/server"
import { Resend } from "resend"

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured")
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 }
      )
    }

    const { userName, userEmail, digitalSignature, address } = await request.json()

    if (!userName || !userEmail || !digitalSignature || !address) {
      console.error("Missing required fields:", { userName, userEmail, digitalSignature, address })
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log("Sending email to:", userEmail)

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Dr. Info <noreply@drinfo.ai>",
      to: userEmail,
      subject: "Your NDA Document - Coming Soon",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Thank You for Completing Registration</h2>
          <p>Dear ${userName},</p>
          <p>Thank you for completing the registration process. We have received your digital signature and address information.</p>
          <p>Your signed Non-Disclosure Agreement will be sent to you shortly. Please keep an eye on your inbox.</p>
          <p>Best regards,<br>Dr. Info Team</p>
        </div>
      `
    })

    if (!emailResponse) {
      console.error("Failed to send email - no response from Resend")
      throw new Error('Failed to send email')
    }

    console.log("Email sent successfully")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error sending email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    )
  }
} 