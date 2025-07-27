import { GuestAuthDebug } from "@/app/components/guest/guest-auth-debug"

export default function DebugGuestAuthPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-4 font-bold text-2xl">Guest Authentication Debug</h1>
      <GuestAuthDebug />
    </div>
  )
}
