import { GuestAuthDebug } from "@/app/components/guest/guest-auth-debug"

export default function DebugGuestAuthPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Guest Authentication Debug</h1>
      <GuestAuthDebug />
    </div>
  )
}