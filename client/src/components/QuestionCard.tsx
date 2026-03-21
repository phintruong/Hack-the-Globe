"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuestionCardProps {
  question: string;
  index: number;
  total: number;
}

export function QuestionCard({ question, index, total }: QuestionCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Interview Question</CardTitle>
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
