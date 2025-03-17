"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ReplaceBookPage() {
  const [oldBook, setOldBook] = useState("");
  const [newBook, setNewBook] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReplace = async () => {
    if (!oldBook || !newBook) {
      toast.error("Please enter both old and new book names");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/books/replace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
        },
        body: JSON.stringify({ oldBook, newBook }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Book name replaced successfully. Updated ${data.analysisUpdated} analysis entries and ${data.shlokasUpdated} shlokas.`
        );
        setOldBook("");
        setNewBook("");
      } else {
        toast.error(data.message || "Failed to replace book name");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to replace book name");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Replace Book Name</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Old Book Name</label>
            <Input
              value={oldBook}
              onChange={(e) => setOldBook(e.target.value)}
              placeholder="Enter old book name"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">New Book Name</label>
            <Input
              value={newBook}
              onChange={(e) => setNewBook(e.target.value)}
              placeholder="Enter new book name"
              disabled={loading}
            />
          </div>
          <Button 
            onClick={handleReplace} 
            disabled={loading || !oldBook || !newBook}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Replacing...
              </>
            ) : (
              "Replace Book Name"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}