export default function NotFound() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="text-center">
        <h1 className="font-semibold text-xl">404 – Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          Sorry, this page doesn’t exist.
        </p>
      </div>
    </div>
  )
}
