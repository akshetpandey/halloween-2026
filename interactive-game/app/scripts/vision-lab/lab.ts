let worker: Worker | null = null;
let generation = 0;
const status = document.querySelector("#status")!;
const metrics = document.querySelector("#metrics")!;
const results = document.querySelector("#results")!;
const records: unknown[] = [];
let fixtures: File[] = [];
document.querySelector("#fixtures")!.addEventListener("click", async () => {
  fixtures = await Promise.all(
    [1, 2, 3].map(
      async (i) =>
        new File(
          [
            await (
              await fetch(`/private/fox-pilot-2026-10-23/fox-${i}.jpg`)
            ).blob(),
          ],
          `fox-${i}.jpg`,
          { type: "image/jpeg" },
        ),
    ),
  );
  status.textContent = "Three local fox fixtures ready.";
});
document.querySelector("#stop")!.addEventListener("click", () => {
  generation++;
  worker?.terminate();
  worker = null;
  status.textContent = "Stopped.";
});
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-model]",
))
  button.onclick = async () => {
    const files = fixtures.length
      ? fixtures
      : Array.from(
          (document.querySelector("#photos") as HTMLInputElement).files ?? [],
        );
    if (!files.length) return;
    worker?.terminate();
    const current = ++generation,
      model = button.dataset.model!;
    worker = new Worker(new URL("./lab.worker.ts", import.meta.url), {
      type: "module",
    });
    const active = worker;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (current !== generation) return;
        status.textContent =
          model + ": stopped after 90s without a completed stage";
        active.terminate();
        records.push({ model, error: "90s stage timeout" });
        metrics.textContent = JSON.stringify(records, null, 2);
      }, 90000);
    };
    deadline();
    let next = 0;
    active.onmessage = async (e) => {
      if (current !== generation) return;
      const reply = e.data;
      clearTimeout(timer);
      if (reply.error) {
        status.textContent = model + ": " + reply.error;
        active.terminate();
        return;
      }
      if (reply.progress) {
        status.textContent = model + ": " + reply.progress;
        return;
      }
      if (reply.ready) {
        records.push({ model, prepareMs: reply.ms });
        status.textContent = model + ": processing";
        next = 0;
        deadline();
        active.postMessage({ model, file: files[next] });
        return;
      }
      records.push({
        model,
        view: next + 1,
        ms: reply.ms,
        area: reply.area,
        features: reply.features,
        score: reply.score,
        box: reply.box,
        detections: reply.detections,
      });
      metrics.textContent = JSON.stringify(records, null, 2);
      if (reply.mask) {
        const original = await createImageBitmap(files[next]),
          canvas = document.createElement("canvas");
        canvas.width = reply.width;
        canvas.height = reply.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(original, 0, 0, canvas.width, canvas.height);
        original.close();
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < reply.mask.length; i++) {
          const factor = reply.mask[i] > 0.5 ? 1 : 0.22;
          for (let c = 0; c < 3; c++) pixels.data[i * 4 + c] *= factor;
        }
        ctx.putImageData(pixels, 0, 0);
        const card = document.createElement("article"),
          title = document.createElement("h2");
        title.textContent = `${model} · view ${next + 1} · ${Math.round(reply.ms)} ms`;
        card.append(title, canvas);
        results.append(card);
      }
      if (++next < files.length) {
        deadline();
        active.postMessage({ model, file: files[next] });
      } else {
        status.textContent = model + ": complete";
        active.terminate();
        worker = null;
      }
    };
    active.onerror = (e) => {
      status.textContent = model + ": " + e.message;
      active.terminate();
    };
    status.textContent = model + ": preparing";
    active.postMessage({ model });
  };
