import { Toaster } from "@/components/ui/sonner"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children} <Toaster position="top-center" />
    </>
  )
}
