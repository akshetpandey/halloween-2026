import { guardians } from "../shared/catalog";
import {
  MAX_REFERENCES,
  normalizeVector,
  VISION_MODEL,
  type VisionManifest,
} from "../shared/vision";
import { body, fail, hex, json, readBody } from "./request";

type ReferenceRow = {
  id: string;
  guardian_id: string | null;
  vector: string;
  created_at: number;
  note: string;
};
async function settings(env: Env) {
  return (await env.DB.prepare(
    "SELECT threshold,margin FROM vision_settings WHERE id=1",
  ).first<{ threshold: number; margin: number }>())!;
}
export async function visionManifest(env: Env, host = false) {
  const rows = (
    await env.DB.prepare(
      `SELECT r.id,r.guardian_id,r.vector,r.created_at,r.note FROM vision_references r
    LEFT JOIN vision_guardians g ON g.guardian_id=r.guardian_id
    WHERE r.model_version=? ${host ? "" : "AND (r.guardian_id IS NULL OR COALESCE(g.enabled,1)=1)"}
    ORDER BY r.created_at,r.id`,
    )
      .bind(VISION_MODEL)
      .all<ReferenceRow>()
  ).results;
  const manifest: VisionManifest = {
    model: VISION_MODEL,
    settings: await settings(env),
    references: rows.map((r) => ({
      id: r.id,
      guardianId: r.guardian_id,
      vector: JSON.parse(r.vector),
    })),
  };
  if (!host) return manifest;
  const enabled = (
    await env.DB.prepare(
      "SELECT guardian_id,enabled FROM vision_guardians",
    ).all<{ guardian_id: string; enabled: number }>()
  ).results;
  return {
    ...manifest,
    photos: rows.map((r) => ({
      id: r.id,
      guardianId: r.guardian_id,
      createdAt: r.created_at,
      note: r.note,
    })),
    guardians: guardians.map((g) => ({
      id: g.id,
      name: g.name,
      art: g.art,
      enabled: enabled.find((e) => e.guardian_id === g.id)?.enabled !== 0,
    })),
  };
}
function guardianId(value: unknown) {
  if (value === "background" || value === null) return null;
  if (typeof value !== "string" || !guardians.some((g) => g.id === value))
    fail("Choose a guardian from the list.", 422);
  return value as string;
}
export async function visionAdmin(
  request: Request,
  env: Env,
  actor: string,
): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/admin/vision" && request.method === "GET")
    return json(await visionManifest(env, true));
  if (path === "/api/admin/vision/settings" && request.method === "POST") {
    const input = await body(request);
    if (
      typeof input.threshold !== "number" ||
      !Number.isFinite(input.threshold) ||
      input.threshold < 0.3 ||
      input.threshold > 0.99 ||
      typeof input.margin !== "number" ||
      !Number.isFinite(input.margin) ||
      input.margin < 0.005 ||
      input.margin > 0.3
    )
      fail(
        "Use a match threshold from 0.30 to 0.99 and a gap from 0.005 to 0.30.",
        422,
      );
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE vision_settings SET threshold=?,margin=? WHERE id=1",
      ).bind(input.threshold, input.margin),
      env.DB.prepare(
        "INSERT INTO host_audit(actor_hash,action,created_at) VALUES(?,'vision_settings',?)",
      ).bind(actor, Date.now()),
    ]);
    return json(await visionManifest(env, true));
  }
  if (path === "/api/admin/vision/guardian" && request.method === "POST") {
    const input = await body(request),
      id = guardianId(input.guardianId);
    if (!id || typeof input.enabled !== "boolean")
      fail("Choose a guardian and its scanning state.", 422);
    await env.DB.prepare(
      "INSERT INTO vision_guardians VALUES(?,?) ON CONFLICT(guardian_id) DO UPDATE SET enabled=excluded.enabled",
    )
      .bind(id, input.enabled ? 1 : 0)
      .run();
    return json(await visionManifest(env, true));
  }
  if (path === "/api/admin/vision/references" && request.method === "POST") {
    const raw = await readBody(request, 2 * 1024 * 1024);
    let form: FormData;
    try {
      form = await new Response(raw, {
        headers: { "Content-Type": request.headers.get("Content-Type") || "" },
      }).formData();
    } catch {
      fail("Choose a reference photo to upload.", 422);
    }
    const id = guardianId(form.get("guardianId"));
    if (form.get("model") !== VISION_MODEL)
      fail(
        "Reload the host dashboard to use the current recognition model.",
        409,
      );
    let vector: number[] | null;
    try {
      vector = normalizeVector(JSON.parse(String(form.get("vector"))));
    } catch {
      fail(
        "The image features could not be read. Try processing the photo again.",
        422,
      );
    }
    if (!vector)
      fail(
        "The image features are incomplete. Try processing the photo again.",
        422,
      );
    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size < 20 || photo.size > 1500000)
      fail("Choose a reference photo up to 1.5 MB.", 422);
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!jpeg)
      fail("Reference photos must be processed as JPEG before uploading.", 422);
    const photoHash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    const duplicate = await env.DB.prepare(
      "SELECT 1 FROM vision_references WHERE photo_hash=? AND model_version=?",
    )
      .bind(photoHash, VISION_MODEL)
      .first();
    if (duplicate)
      fail(
        "This reference photo is already saved. Add a different angle or lighting instead.",
        409,
      );
    const ref = hex(16),
      key = "guardian-reference/" + ref;
    const note = String(form.get("note") || "")
      .trim()
      .slice(0, 100);
    await env.PHOTOS.put(key, bytes, {
      metadata: { contentType: "image/jpeg" },
    });
    try {
      const result = await env.DB.prepare(
        `INSERT OR IGNORE INTO vision_references(id,guardian_id,photo_key,photo_hash,model_version,vector,note,created_at)
        SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM vision_references WHERE guardian_id IS ? AND model_version=?)<?`,
      )
        .bind(
          ref,
          id,
          key,
          photoHash,
          VISION_MODEL,
          JSON.stringify(vector),
          note,
          Date.now(),
          id,
          VISION_MODEL,
          MAX_REFERENCES,
        )
        .run();
      if (!result.meta.changes)
        fail(
          "This photo is already saved, or this guardian has reached its 40-reference limit.",
          409,
        );
    } catch (error) {
      await env.PHOTOS.delete(key);
      throw error;
    }
    return json({ id: ref }, 201);
  }
  const match = path.match(
    /^\/api\/admin\/vision\/references\/([a-f0-9]{32})$/,
  );
  if (match && ["GET", "DELETE"].includes(request.method)) {
    const row = await env.DB.prepare(
      "SELECT photo_key FROM vision_references WHERE id=?",
    )
      .bind(match[1])
      .first<{ photo_key: string }>();
    if (!row) fail("Reference photo unavailable.", 404);
    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM vision_references WHERE id=?")
        .bind(match[1])
        .run();
      await env.PHOTOS.delete(row.photo_key);
      return json({ ok: true });
    }
    const photo = await env.PHOTOS.get(row.photo_key, "arrayBuffer");
    if (!photo)
      fail("The photo is still arriving. Try again in a moment.", 404);
    return new Response(photo, { headers: { "Content-Type": "image/jpeg" } });
  }
  fail("Not found.", 404);
}
