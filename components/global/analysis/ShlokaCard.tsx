import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { BookOpen, Share2Icon } from "lucide-react";

interface ShlokaCardProps {
  book: string;
  chaptno: string;
  shloka: {
    slokano: string;
    spart: string;
  };
}

export function ShlokaCard({ book, chaptno, shloka }: ShlokaCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-medium">
            {decodeURIComponent(typeof book === "string" ? book : book[0])
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {chaptno}.{shloka?.slokano}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            {shloka?.spart.split("#").map((part, index) => (
              <p key={index} className="text-lg font-sanskrit leading-relaxed">
                {part.trim()}
              </p>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              View Commentary
            </Button>
            <Button variant="outline" size="sm">
              <Share2Icon className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 