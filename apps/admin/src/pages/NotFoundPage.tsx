import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/70 px-4 py-10">
      <Card className="w-full max-w-lg border">
        <CardHeader>
          <CardTitle className="font-display text-3xl">404</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-lg font-semibold">Page not found</p>
          <p className="text-sm text-muted-foreground">
            The address you entered does not match any active page. Try going back to the dashboard.
          </p>
          <div className="flex justify-center">
            <Button
              variant="outline"
              asChild
            >
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
