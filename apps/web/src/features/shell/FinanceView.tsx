import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Button } from "../../components/ui/button.js";
import { WalletIcon } from "lucide-react";

export function FinanceView({ membership: _membership }: { membership: any }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Finance</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage fees, payments, and expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Total Fees", value: "₹2,45,000", className: "text-foreground" },
          { label: "Collected", value: "₹1,80,000", className: "text-foreground" },
          { label: "Pending", value: "₹65,000", className: "text-destructive" },
        ].map(({ label, value, className }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
                  <p className={`text-2xl font-semibold font-mono ${className}`}>{value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${label === "Pending" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}>
                  <WalletIcon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finance Management</CardTitle>
          <CardDescription>Manage fee structures, payments, and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-center">Manage Fee Structures</Button>
            <Button variant="outline" className="justify-center">Record Payment</Button>
            <Button variant="outline" className="justify-center">Track Expenses</Button>
            <Button variant="outline" className="justify-center">View Reports</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
