import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="hidden border-r bg-muted/40 sm:block sm:w-64 sm:fixed sm:inset-y-0 sm:z-20">
        <Sidebar />
      </div>
      <div className="flex flex-col sm:pl-64">
        <Header />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
