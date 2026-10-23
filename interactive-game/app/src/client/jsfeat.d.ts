declare module "jsfeat" {
  type Keypoint = {
    x: number;
    y: number;
    score: number;
    angle: number;
    level: number;
  };
  class matrix_t {
    constructor(cols: number, rows: number, type: number);
    data: Uint8Array;
    cols: number;
    rows: number;
  }
  const jsfeat: {
    U8_t: number;
    C1_t: number;
    matrix_t: typeof matrix_t;
    keypoint_t: new () => Keypoint;
    imgproc: {
      grayscale(
        src: Uint8Array | Uint8ClampedArray,
        width: number,
        height: number,
        out: matrix_t,
      ): void;
      gaussian_blur(
        src: matrix_t,
        dst: matrix_t,
        kernel: number,
        sigma: number,
      ): void;
    };
    yape06: {
      laplacian_threshold: number;
      min_eigen_value_threshold: number;
      detect(src: matrix_t, points: Keypoint[], border: number): number;
    };
    orb: {
      describe(
        src: matrix_t,
        points: Keypoint[],
        count: number,
        out: matrix_t,
      ): void;
    };
  };
  export default jsfeat;
}
