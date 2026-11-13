import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function App({ baseUrl = "/" }: { baseUrl?: string }) {
  const [count, setCount] = useState(0)

  return (
    <>
      <header className="border-b">
        <SiteHeader baseUrl={baseUrl} activePage="accueil" />
      </header>
      <main id="contenu" tabIndex={-1} className="mx-auto max-w-5xl px-6 py-12">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle><h1 className="text-2xl">Hello world</h1></CardTitle>
            <CardDescription>Un exemple React avec shadcn/ui.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCount(count + 1)}>Clics : {count}</Button>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
