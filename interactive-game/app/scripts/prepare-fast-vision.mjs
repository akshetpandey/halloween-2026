// Export the pinned MobileNet's 1024-value penultimate features, removing its
// ImageNet classifier. All ONNX data types/attributes use the official schema.
import protobuf from "protobufjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const base =
  "https://huggingface.co/onnx-community/mobilenetv3_small_100.lamb_in1k/resolve/b1a19675d33130739e56503b5bfd6534a0f9e01d/";
const cache = new URL("../private/model-sources/", import.meta.url);
const target = new URL(
  "../public/models/hc-lens-mbv3-b1a19675-f32-v2/",
  import.meta.url,
);
await mkdir(cache, { recursive: true });
await mkdir(target, { recursive: true });
async function pinned(name, url, expected) {
  let bytes;
  try {
    bytes = await readFile(new URL(name, cache));
  } catch {}
  if (!bytes) {
    const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!r.ok) throw Error(name + ": HTTP " + r.status);
    bytes = Buffer.from(await r.arrayBuffer());
    await writeFile(new URL(name, cache), bytes);
  }
  if (hash(bytes) !== expected) throw Error(name + ": SHA-256 mismatch");
  return bytes;
}
const source = await pinned(
  "mobilenet-float.onnx",
  base + "onnx/model.onnx",
  "d36eea8c3298d339c232581dff18beed6651eacd607d0a531b7bdb100f8dc713",
);
const schema = await pinned(
  "onnx.proto3",
  "https://raw.githubusercontent.com/onnx/onnx/v1.19.1/onnx/onnx.proto3",
  "c2a24681ba16a6af3eca7ac70c657fb1e3a9598506b6dc98501a77ba0e5ff2bc",
);
const Model = protobuf
  .parse(schema.toString())
  .root.lookupType("onnx.ModelProto");
const model = Model.decode(source),
  graph = model.graph,
  output = "/flatten/Flatten_output_0";
if (!graph.node.some((n) => n.output.includes(output)))
  throw Error("Pinned MobileNet feature output changed");
const required = new Set([output]);
const nodes = [];
for (const node of [...graph.node].reverse())
  if (node.output.some((name) => required.has(name))) {
    nodes.push(node);
    node.input.forEach((name) => required.add(name));
  }
graph.node = nodes.reverse();
graph.initializer = graph.initializer.filter((t) => required.has(t.name));
graph.valueInfo = [];
graph.output = [
  {
    name: output,
    type: {
      tensorType: {
        elemType: 1,
        shape: { dim: [{ dimValue: 1 }, { dimValue: 1024 }] },
      },
    },
  },
];
const features = Model.encode(model).finish();
if (features.length !== 6082421)
  throw Error("Unexpected MobileNet feature graph size");
if (
  hash(features) !==
  "a6232f9b79219f2c283cf3b058378248fa7e89c3d93d4b149bb9aa82ad5eff56"
)
  throw Error("Derived MobileNet feature checksum changed");
await writeFile(new URL("mobilenet-features.onnx", target), features);
const license = await pinned(
  "MOBILENET-LICENSE.txt",
  "https://raw.githubusercontent.com/huggingface/pytorch-image-models/v1.0.20/LICENSE",
  "71b111620fa32c17a80ccd6db2da759d31a591e497d8b5f382174f59d1b59d49",
);
await writeFile(new URL("LICENSE.txt", target), license);
await writeFile(
  new URL("NOTICE.txt", target),
  "MobileNetV3 small by timm; ONNX export by onnx-community. Apache-2.0. This derived model removes the classifier and exports the 1024-value penultimate feature vector. ONNX schema by the ONNX project, Apache-2.0. Sources and checksums: manifest.json.\n",
);
await writeFile(
  new URL("manifest.json", target),
  JSON.stringify(
    {
      model: "mobilenetv3-small-f32-b1a19675-features-v2",
      dimensions: 1024,
      bytes: features.length,
      sha256: hash(features),
      source: base + "onnx/model.onnx",
      sourceSha256: hash(source),
      schemaSha256: hash(schema),
      output,
      crop: "center square covering 224/256 of the short edge; resize 224; ImageNet mean/std",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Fast recognition: " + features.length + " bytes, SHA-256 " + hash(features),
);
