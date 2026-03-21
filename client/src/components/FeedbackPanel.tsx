"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface STARFeedback {
  situation: number;
  task: number;
  action: number;
  result: number;
  improvements: string[];
  polishedAnswer: string;
}

interface FeedbackPanelProps {
  feedback: STARFeedback;
  originalAnswer: string;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

export function FeedbackPanel({
  feedback,
  originalAnswer,
}: FeedbackPanelProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>STAR Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScoreBar label="Situation" value={feedback.situation} />
          <ScoreBar label="Task" value={feedback.task} />
          <ScoreBar label="Action" value={feedback.action} />
          <ScoreBar label="Result" value={feedback.result} />
        </CardContent>
      </Card>

      {feedback.improvements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {feedback.improvements.map((imp, i) => (
                <li key={i}>{imp}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Polished Answer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
              Your answer
            </p>
            <p className="text-sm bg-muted rounded p-3">{originalAnswer}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
              Polished version
            </p>
            <p className="text-sm bg-primary/5 border border-primary/20 rounded p-3">
              {feedback.polishedAnswer}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
