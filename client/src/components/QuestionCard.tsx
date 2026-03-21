"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuestionCardProps {
  question: string;
  index: number;
  total: number;
  moduleName?: string;
}

export function QuestionCard({ question, index, total, moduleName }: QuestionCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          {moduleName && (
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              {moduleName}
            </p>
          )}
          <CardTitle className="text-xl">Interview Question</CardTitle>
        </div>
        <Badge variant="secondary">
          {index + 1} / {total}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-lg">{question}</p>
      </CardContent>
    </Card>
  );
}
