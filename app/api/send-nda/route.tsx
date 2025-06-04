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

    // Get current date in a formatted string
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Send email notification with formatted NDA
    const emailResponse = await resend.emails.send({
      from: "Dr. Info <noreply@drinfo.ai>",
      to: userEmail,
      subject: "Your Signed Non-Disclosure Agreement",
      html: `
        <div style="max-width: 800px; margin: 0 auto; padding: 32px; background-color: white; font-family: 'DM Sans', sans-serif;">
          <div style="border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 8px; padding: 32px; background-color: #F4F7FF;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://app.drinfo.ai/login-logo.png" alt="Dr. Info Logo" style="max-width: 200px; height: auto;" />
            </div>
            <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 32px; color: #223258; font-family: 'DM Sans', sans-serif;">
              Non-Disclosure Agreement (Online)
            </h1>
            
            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                1. Parties
              </h2>
              <div style=" font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                <p>
                  <span style="font-weight: 500;">Disclosing Party:</span> Synduct GmbH, Bergmannstrasse 58, 80339 Munich, Germany, represented by Managing Director Valentine Emmanuel.
                </p>
                <p>
                  <span style="font-weight: 500;">Receiving Party:</span> ${userName} residing at ${address}.
                </p>
              </div>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                2. Purpose
              </h2>
              <p style="color: #334155; font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                Synduct GmbH will disclose confidential information so you can evaluate and, where applicable, test its AI-enabled content-management platform for the pharmaceutical, biotechnology and medical-technology sectors.
              </p>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                3. Confidential Information
              </h2>
              <p style="color: #334155; margin-bottom: 12px; font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                "Confidential Information" includes, without limitation:
              </p>
              <ul style="list-style-type: disc; padding-left: 24px; color: #334155; margin-bottom: 12px; font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                <li>business plans, financial data, forecasts, marketing strategies;</li>
                <li>product or service roadmaps, customer or supplier details;</li>
                <li>technical data, software code, algorithms, designs, processes and trade secrets;</li>
                <li>any materials derived from, or that reference, the above.</li>
              </ul>
              <p style="color: #334155; font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                <span style="font-weight: 500;">Exclusions:</span> information that (a) you already lawfully possessed, (b) becomes public not through your fault, (c) is received from a third party with no duty of confidence, (d) is independently developed without access to the Confidential Information, or (e) must be disclosed by law (provided you give prompt written notice).
              </p>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                4. Your Obligations
              </h2>
              <ul style="list-style-type: disc; padding-left: 24px; color: #334155; font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                <li>Keep all Confidential Information strictly confidential and apply at least reasonable security measures.</li>
                <li>Share it only with staff or advisers bound by equivalent confidentiality and only as needed for the purpose above.</li>
                <li>Use it exclusively to evaluate or perform the potential collaboration; no other use is permitted.</li>
                <li>Return or securely destroy all Confidential Information (including copies and notes) at Synduct GmbH's request.</li>
              </ul>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                5. Breach & Penalties
              </h2>
              <p style="color: #334155; font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                Unauthorised use or disclosure triggers a liquidated penalty of €100,000, plus compensation for any additional proven loss. Synduct GmbH may also seek injunctive relief. Compliance with all applicable data-protection laws (including GDPR) is mandatory.
              </p>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                6. Term
              </h2>
              <p style="color: #334155; font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                This Agreement is effective for 10 years from the first disclosure; confidentiality obligations survive indefinitely.
              </p>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                7. Governing Law & Jurisdiction
              </h2>
              <p style="color: #334155; font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                German law governs. Exclusive venue: Munich, Germany.
              </p>
            </div>

            <div style="margin-top: 48px; border-top: 1px solid rgba(55, 113, 254, 0.5); padding-top: 24px;">
              <p style="color: #334155; margin-bottom: 8px; font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                <span style="font-weight: 500;">Digital Signature:</span> ${digitalSignature}
              </p>
              <p style="color: #334155; margin-bottom: 8px; font-size: 18px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                <span style="font-weight: 500;">Date:</span> ${currentDate}
              </p>
            </div>
          </div>
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