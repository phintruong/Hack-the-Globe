declare module "@mediapipe/tasks-vision" {
  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }

  export class FilesetResolver {
    static forVisionTasks(wasmPath: string): Promise<unknown>;
  }

  export class HandLandmarker {
    static createFromOptions(
      fileset: unknown,
      options: {
        baseOptions: {
          modelAssetPath: string;
          delegate?: string;
        };
        runningMode: string;
        numHands?: number;
      }
    ): Promise<HandLandmarker>;

    detectForVideo(
      video: HTMLVideoElement,
      timestamp: number
    ): {
      landmarks: NormalizedLandmark[][];
      handednesses: { categoryName: string }[][];
    };
  }
}
