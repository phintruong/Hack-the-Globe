declare module "fingerpose" {
  export class GestureDescription {
    constructor(name: string);
    addCurl(finger: number, curl: number, weight?: number): void;
    addDirection(finger: number, direction: number, weight?: number): void;
  }

  export class GestureEstimator {
    constructor(gestures: GestureDescription[]);
    estimate(
      landmarks: number[][],
      minScore: number
    ): {
      gestures: { name: string; score: number }[];
      poseData: unknown;
    };
  }

  export const Finger: {
    Thumb: number;
    Index: number;
    Middle: number;
    Ring: number;
    Pinky: number;
  };

  export const FingerCurl: {
    NoCurl: number;
    HalfCurl: number;
    FullCurl: number;
  };

  export const FingerDirection: {
    VerticalUp: number;
    VerticalDown: number;
    HorizontalLeft: number;
    HorizontalRight: number;
    DiagonalUpLeft: number;
    DiagonalUpRight: number;
    DiagonalDownLeft: number;
    DiagonalDownRight: number;
  };

  const fp: {
    GestureDescription: typeof GestureDescription;
    GestureEstimator: typeof GestureEstimator;
    Finger: typeof Finger;
    FingerCurl: typeof FingerCurl;
    FingerDirection: typeof FingerDirection;
  };

  export default fp;
}
