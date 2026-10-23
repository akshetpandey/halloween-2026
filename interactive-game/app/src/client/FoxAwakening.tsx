import React, { useEffect, useRef } from "react";
import { rigWeight, type FoxRig } from "./fox-rig";

const vertex = `
attribute vec2 a_uv;
attribute vec2 a_weights;
uniform vec2 u_size;
uniform vec2 u_neck;
uniform vec2 u_rump;
uniform vec2 u_angles;
varying vec2 v_uv;
vec2 turn(vec2 p, vec2 pivot, float angle) {
  vec2 d = p - pivot;
  return pivot + vec2(cos(angle)*d.x - sin(angle)*d.y, sin(angle)*d.x + cos(angle)*d.y);
}
void main() {
  vec2 p = a_uv * u_size;
  vec2 moved = p + (turn(p, u_neck, u_angles.x) - p) * a_weights.x
                   + (turn(p, u_rump, u_angles.y) - p) * a_weights.y;
  gl_Position = vec4(moved / u_size * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
  v_uv = a_uv;
}`;
const fragment = `
precision mediump float;
uniform sampler2D u_photo;
varying vec2 v_uv;
void main() { gl_FragColor = texture2D(u_photo, v_uv); }
`;

// One small texture and draw call, no extra model or video stream. All geometry
// is bounded by the existing 512px cutout. Context failure leaves the still.
export function FoxAwakening({
  src,
  rig,
  moving,
  onAvailable,
  parts = "both",
}: {
  src: string;
  rig: FoxRig;
  moving: boolean;
  onAvailable: (ready: boolean) => void;
  parts?: "head" | "tail" | "both";
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const available = useRef(onAvailable);
  available.current = onAvailable;
  const live = useRef({ rig, moving, parts });
  live.current = { rig, moving, parts };
  const rebuild = useRef<(() => void) | null>(null);
  useEffect(() => {
    rebuild.current?.();
  }, [rig, moving]);
  useEffect(() => {
    const element = canvas.current!;
    const gl = element.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
    });
    available.current(false);
    if (!gl) return;
    let disposed = false,
      frame = 0,
      last = -Infinity,
      program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null,
      texture: WebGLTexture | null = null;
    const shaders: WebGLShader[] = [];
    const image = new Image();
    let count = 0,
      draw: ((time: number) => void) | null = null;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const tick = (time: number) => {
      frame = 0;
      if (disposed || document.hidden || !draw) return;
      if (time - last >= 1000 / 24) {
        draw(time);
        last = time;
      }
      if (live.current.moving) frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      stop();
      last = -Infinity;
      if (!document.hidden && draw) frame = requestAnimationFrame(tick);
    };
    const fail = () => {
      stop();
      available.current(false);
    };
    const lost = () => {
      disposed = true;
      fail();
    };
    element.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", resume);
    image.onload = () => {
      if (disposed) return;
      try {
        element.width = image.naturalWidth;
        element.height = image.naturalHeight;
        for (const [type, source] of [
          [gl.VERTEX_SHADER, vertex],
          [gl.FRAGMENT_SHADER, fragment],
        ] as const) {
          const shader = gl.createShader(type)!;
          shaders.push(shader);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            throw Error("Shader unavailable");
        }
        program = gl.createProgram()!;
        shaders.forEach((shader) => gl.attachShader(program!, shader));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw Error("Animation unavailable");
        gl.useProgram(program);
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const uv = gl.getAttribLocation(program, "a_uv"),
          weights = gl.getAttribLocation(program, "a_weights");
        gl.enableVertexAttribArray(uv);
        gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(weights);
        gl.vertexAttribPointer(weights, 2, gl.FLOAT, false, 16, 8);
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image,
        );
        gl.uniform1i(gl.getUniformLocation(program, "u_photo"), 0);
        gl.uniform2f(
          gl.getUniformLocation(program, "u_size"),
          element.width,
          element.height,
        );
        const angles = gl.getUniformLocation(program, "u_angles");
        const started = performance.now();
        draw = (time) => {
          const t = (time - started) / 1000;
          const animated = live.current.moving;
          const arrival = Math.min(1, t / 1.4);
          gl.uniform2f(
            angles,
            animated && live.current.parts !== "tail"
              ? Math.sin(t * 1.25) * 0.075 * arrival
              : 0,
            animated && live.current.parts !== "head"
              ? (Math.sin(t * 1.8) + 0.3 * Math.sin(t * 3.3)) * 0.11 * arrival
              : 0,
          );
          gl.viewport(0, 0, element.width, element.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLES, 0, count);
        };
        rebuild.current = () => {
          if (disposed || !program) return;
          const current = live.current.rig,
            data: number[] = [],
            steps = 40;
          const add = (x: number, y: number) => {
            const p = { x: x / steps, y: y / steps };
            data.push(
              p.x,
              p.y,
              rigWeight(
                p,
                current.head,
                current.neck,
                element.width,
                element.height,
                false,
              ),
              rigWeight(
                p,
                current.tail,
                current.rump,
                element.width,
                element.height,
                true,
              ),
            );
          };
          for (let y = 0; y < steps; y++)
            for (let x = 0; x < steps; x++) {
              add(x, y);
              add(x + 1, y);
              add(x, y + 1);
              add(x + 1, y);
              add(x + 1, y + 1);
              add(x, y + 1);
            }
          count = data.length / 4;
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(data),
            gl.STATIC_DRAW,
          );
          gl.uniform2f(
            gl.getUniformLocation(program, "u_neck"),
            current.neck.x * element.width,
            current.neck.y * element.height,
          );
          gl.uniform2f(
            gl.getUniformLocation(program, "u_rump"),
            current.rump.x * element.width,
            current.rump.y * element.height,
          );
          resume();
        };
        rebuild.current();
        available.current(true);
      } catch {
        fail();
      }
    };
    image.onerror = fail;
    image.src = src;
    return () => {
      disposed = true;
      stop();
      rebuild.current = null;
      image.onload = image.onerror = null;
      image.src = "";
      element.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", resume);
      if (texture) gl.deleteTexture(texture);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      element.width = element.height = 1;
    };
  }, [src]);
  // A new texture gets a fresh canvas; the previous context is explicitly lost
  // on cleanup and must never be reused for the next outline.
  return (
    <canvas
      key={src}
      ref={canvas}
      className="lens-fox-puppet"
      aria-hidden="true"
    />
  );
}
