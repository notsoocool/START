"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UploadJsonPage from "@/components/global/upload-json"; // Import your JSON upload component
import UserPerms from "@/components/global/user-perms"; // Import your permission change component
import router from "next/router";
import { toast } from "sonner";

export default function AdminPage() {

  const [activeTab, setActiveTab] = useState("upload");
  
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const response = await fetch("/api/getCurrentUser");
        if (!response.ok) {
          throw new Error("User not authenticated");
        }

        const data = await response.json();


        if (data.perms !== "Admin" && data.perms !== "Root") {
            router.push("/"); // Redirect to main page
        }
      } catch (error) {
        toast.error("Authorization check failed:");
        router.push("/");
      }
    };

    checkAuthorization();
  }, [router]);

  return (
    <Tabs defaultValue="upload" className="space-y-4 mx-4 my-4">
      <TabsList>
        <TabsTrigger value="upload" onClick={() => setActiveTab("upload")}>
          Upload JSON
        </TabsTrigger>
        <TabsTrigger value="permissions" onClick={() => setActiveTab("permissions")}>
          Change User Permissions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload">
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Upload JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadJsonPage />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="permissions">
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Change User Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <UserPerms />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
