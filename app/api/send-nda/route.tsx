import { NextResponse } from "next/server"
import { Resend } from "resend"
import { logger } from '@/lib/logger'

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      logger.error("RESEND_API_KEY is not configured")
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 }
      )
    }

    const { userName, userEmail, digitalSignature, address } = await request.json()

    if (!userName || !userEmail || !digitalSignature || !address) {
      logger.error("Missing required fields:", { userName, userEmail, digitalSignature, address })
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    logger.apiLog("Sending email to:", userEmail)

    // Get current date in a formatted string
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Send email notification with formatted NDA
    const emailResponse = await resend.emails.send({
      from: "DR. INFO <noreply@drinfo.ai>",
      to: userEmail,
      subject: "Your Signed Non-Disclosure Agreement",
      html: `
        <div style="font-family: 'DM Sans', sans-serif; color: #223258; font-size: 16px; margin-bottom: 32px;">
          <p style="font-weight: 600; font-family: 'DM Sans', sans-serif;">Dear ${userName},</p>
          <p>Thank you for signing up with DR. INFO.<br>
          Please find below your signed <span style="font-weight: 600; font-family: 'DM Sans', sans-serif;">Non-Disclosure Agreement</span> for your records. This confirms your acceptance of the terms and commitment to confidentiality.<br>
          We recommend that you save a copy of this for your future reference.</p>
          <p>If you need any assistance, feel free to contact us at <a href="mailto:info@synduct.com" style="color: #3771FE;">info@synduct.com</a> anytime.</p>
          <p>Thank you for shaping the future of evidence-based care with us!</p>
          <p style="font-family: 'DM Sans', sans-serif; color: #223258; font-weight: 600; margin-top: 16px;">DR. INFO by Synduct team</p>
        </div>
        <div style="max-width: 800px; margin: 0 auto; padding: 32px; background-color: white; font-family: 'DM Sans', sans-serif;">
          <div style="border: 2px solid rgba(55, 113, 254, 0.5); border-radius: 8px; padding: 32px; background-color: #F4F7FF;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://app.drinfo.ai/login-logo.png" alt="Dr. Info Logo" style="max-width: 200px; height: auto;" />
            </div>
            <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 4px; color: #223258; font-family: 'DM Sans', sans-serif;">
              Non-Disclosure Agreement (Online)
            </h1>
            <p style="font-size: 20px; font-style: italic; text-align: center; margin-bottom: 32px; color: #223258; font-family: 'DM Sans', sans-serif;">
              (for Beta-Testers & Co-Developing Clinicians)
            </p>
            
            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                1. Parties
              </h2>
              <div style=" font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                <p>
                  <span style="font-weight: 500;"><strong>Disclosing Party:</strong></span> <a href="https://synduct.com/" style="color: #3771FE; text-decoration: underline;" target="_blank" rel="noopener">Synduct GmbH, Bergmannstrasse 58, 80339 Munich, Germany</a>, represented by Managing Director Valentine Emmanuel.
                </p>
                <p>
                  <span style="font-weight: 500;"><strong>Receiving Party:</strong></span> ${userName} residing at ${address} ("<strong>you</strong>").
                </p>
              </div>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                2. Purpose
              </h2>
              <p style="color: #000000; font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                Synduct will share non-public product ideas, prototype features, medical content and usage data so that you can test DrInfo.ai, give feedback and co-develop new clinical functions. The information is provided solely for that purpose.
              </p>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                3.  What Counts as "Confidential Information"
              </h2>
              <p style="color: #000000; margin-bottom: 12px; font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                "Confidential Information" includes, without limitation:
              </p>
              <ul style="list-style-type: disc; padding-left: 24px; color: #000000; margin-bottom: 12px; font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                <li>Screens, source code, algorithms, model prompts, datasets, evaluation results;</li>
                <li>Product roadmaps, pricing, commercial or go-to-market plans;</li>
                <li>Any feedback you provide that references internal workings of DrInfo.ai;</li>
                <li>All other non-public materials or knowledge disclosed in the course of this early-access programme until its completion.</li>
              </ul>
              <p style="color: #000000; font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                <span style="font-weight: 500;">Exclusions:</span> information that (a) you already lawfully possessed, (b) becomes public not through your fault, (c) is received from a third party with no duty of confidence, (d) is independently developed without access to the Confidential Information, or (e) must be disclosed by law (provided you give prompt written notice).
              </p>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                4. Your Commitments
              </h2>
              <ul style="list-style-type: disc; padding-left: 24px; color: #000000; font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                <li><span style="font-weight: 500;">Keep it private.</span> You must not publish screenshots, share files or discuss details outside the closed test group consisting solely of Synduct-employees or expressly authorised and identified testers.</li>
                <li><span style="font-weight: 500;">Use only for evaluation.</span> No reverse engineering, no independent commercial exploitation, and no development of competing products.</li>
                <li><span style="font-weight: 500;">Limit sharing.</span> Should you wish to involve a colleague, that person must first complete the same NDA process and receive an individual test account from Synduct.</li>
                <li><span style="font-weight: 500;">Delete on request.</span> Within seven (7) days of Synduct's written request—or upon termination of the testing period—you must delete or return all Confidential Information, including notes and copies.</li>
              </ul>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                5. Data Protection & Patient Safety 
              </h2>
              <p style="color: #000000; font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                ou will not upload identifiable patient data. If you share de-identified cases, you confirm they comply with GDPR and local medical-confidentiality rules.
              </p>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                6. Term & Survival 
              </h2>
              <p style="color: #000000; font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                The agreement starts when you click "Accept NDA" and lasts 3 years after the beta ends. Key confidentiality obligations survive as long as the information is not public.
              </p>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                7. Breach & Penalties
              </h2>
              <p style="color: #000000; font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
               Unauthorised use or disclosure triggers a liquidated penalty of EUR 50000 plus compensation for any further proven losses. Synduct GmbH may seek injunctive relief in addition to monetary damages. Full compliance with all applicable data-protection laws, including the GDPR, is mandatory.
              </p>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                8. Governing Law & Venue
              </h2>
              <p style="color: #000000; font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                German law applies; exclusive venue is Munich.
              </p>
            </div>

            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #223258; font-family: 'DM Sans', sans-serif;">
                9. Online Acceptance
              </h2>
              <p style="color: #000000; font-size: 16px; font-weight: 400; font-family: 'DM Sans', sans-serif;">
                By clicking "I accept" you confirm you have read and agree to this Non-Disclosure Agreement. Your electronic consent is legally binding. 
              </p>
            </div>

            <div style="margin-top: 48px; border-top: 1px solid rgba(55, 113, 254, 0.5); padding-top: 24px;">
              <p style="color: #000000; margin-bottom: 8px; font-size: 16px; font-weight: 500; font-family: 'DM Sans', sans-serif;">
                <span style="font-weight: 500;">Digital Signature:</span> ${digitalSignature}
              </p>
              <p style="color: #000000; margin-bottom: 8px; font-size: 16px; font-weight: 500; font-family: 'DM Sans', sans-serif;">
                <span style="font-weight: 500;">Date:</span> ${currentDate}
              </p>
              <p style="color: #000000; margin-bottom: 8px; font-size: 16px; font-weight: 500; font-family: 'DM Sans', sans-serif;">
                <span style="font-weight: 500;">Place:</span> ${address}
              </p>
            </div>
          </div>
        </div>
      `
    })

    if (!emailResponse) {
      logger.error("Failed to send email - no response from Resend")
      throw new Error('Failed to send email')
    }

    logger.apiLog("Email sent successfully")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error("Error sending email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    )
  }
}