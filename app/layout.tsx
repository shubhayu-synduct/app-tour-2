import type React from "react"
import type { Metadata } from "next"
import { Inter, Poppins } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/providers/auth-provider"
import { Analytics } from "@vercel/analytics/next"
import { TourProvider, GuidelineTourProvider, DrugTourProvider, DrinfoSummaryTourProvider } from "@/components/TourContext";

const inter = Inter({ subsets: ["latin"] })
const poppins = Poppins({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-poppins'
})

export const metadata: Metadata = {
  title: "Dr. Info - Medical AI Assistant",
  description: "Get instant access to evidence-based, trusted medical information",
  generator: 'v0.dev',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  },
  icons: {
    icon: [
      {
        url: '/favicon.png',

        type: 'image/png',
      }
    ],
    apple: [
      {
        url: '/favicon.png',
        type: 'image/png',
      }
    ],
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`${inter.className} ${poppins.variable} font-['DM_Sans']`}>
        <DrinfoSummaryTourProvider>
          <DrugTourProvider>
            <GuidelineTourProvider>
              <TourProvider>
                <AuthProvider>{children}</AuthProvider>
              </TourProvider>
            </GuidelineTourProvider>
          </DrugTourProvider>
        </DrinfoSummaryTourProvider>
        <Analytics />
      </body>
    </html>
  )
}
