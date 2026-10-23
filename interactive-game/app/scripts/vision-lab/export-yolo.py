"""Private fox-reference experiment; run from app with ultralytics==8.4.184.
Never publish this reference-conditioned model as an app asset.
"""
from pathlib import Path
import os
import numpy as np
from ultralytics import YOLOE
import torch
root=Path.cwd()
ref=(root/'private/fox-pilot-2026-10-23/fox-2.jpg').resolve()
work=root/'private/vision-comparison-2026-10-23/yolo-bench'
work.mkdir(parents=True,exist_ok=True)
os.chdir(work)
torch.set_num_threads(1)
model=YOLOE('yoloe-26n-seg.pt')
model.predict(str(ref),refer_image=str(ref),visual_prompts={'bboxes':np.array([[185,255,575,725]]),'cls':np.array([0])},device='cpu',imgsz=640,verbose=False)
out=model.export(format='onnx',imgsz=640,opset=17,simplify=False,dynamic=False)
(root/'private/vision-comparison-2026-10-23/yoloe-26n-seg.onnx').write_bytes(Path(out).read_bytes())
