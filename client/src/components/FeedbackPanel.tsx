"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AnswerFeedback, STARFeedback, PuzzleFeedback } from "@/types/index";

interface FeedbackPanelProps {
  feedback: AnswerFeedback;
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

function STARPanel({ data }: { data: STARFeedback }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>STAR Evaluation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScoreBar label="Situation" value={data.situation} />
        <ScoreBar label="Task" value={data.task} />
        <ScoreBar label="Action" value={data.action} />
        <ScoreBar label="Result" value={data.result} />
      </CardContent>
    </Card>
  );
}

function PuzzlePanel({ data }: { data: PuzzleFeedback }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Puzzle Evaluation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScoreBar label="Reasoning Clarity" value={data.reasoning_clarity} />
        <ScoreBar label="Structure" value={data.structure} />
        <ScoreBar label="Assumptions" value={data.assumptions} />
        <ScoreBar label="Communication" value={data.communication} />
      </CardContent>
    </Card>
  );
}

export function FeedbackPanel({ feedback, originalAnswer }: FeedbackPanelProps) {
  const improvements = feedback.data.improvements;
  const polishedAnswer = feedback.data.polishedAnswer;

  return (
    <div className="space-y-4">
      {feedback.type === "behavioral" ? (
        <STARPanel data={feedback.data} />
      ) : (
        <PuzzlePanel data={feedback.data} />
      )}

      {improvements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {improvements.map((imp, i) => (
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
              {polishedAnswer}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
