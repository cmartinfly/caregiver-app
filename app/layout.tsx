import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Caregiver Clock",
  description: "Clock in, clock out, and manage caregiver schedules.",
  manifest: "/manifest.json",
  themeColor: "#000000",
  icons: {
    apple: "/icon-192.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

