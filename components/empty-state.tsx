"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlusCircle, Wallet } from "lucide-react"
import { NewAccountDialog } from "./new-account-dialog"

interface EmptyStateProps {
  onCreateAccount: () => void
}

export function EmptyState({ onCreateAccount }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">
          Get started by adding your first account to track your finances.
        </p>
        <NewAccountDialog
          trigger={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Your First Account
            </Button>
          }
        />
      </CardContent>
    </Card>
  )
}
