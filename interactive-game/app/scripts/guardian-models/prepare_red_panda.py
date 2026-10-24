"""Extract the host's specific Polycam panda, repack only its texels, and rig it.

Run with Python + NumPy + Pillow. Source and inspection images stay private.
This is deliberately calibrated to one capture, not a generic segmentation claim.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import io
import json
import math
from pathlib import Path
import struct

import numpy as np
from PIL import Image, ImageDraw

SOURCE_SHA = "8c149e52a6fb268559056b8bf3fac3a5bbe8d00e00c0cb8534a40dd76b9ad282"
TABLE = np.array([-.0122749121, -.0210391494, .1886630849])
CENTRE = np.array([.03552, 0, .19642])
ATLAS = 2048
PAD = 6
PARTS = ["Body", "Head", "TailBase", "TailMiddle", "TailTip", "FrontLeft", "FrontRight", "RearLeft", "RearRight"]
PIVOTS = np.array([[0,0,0], [0,.094,.067], [-.016,.123,-.097], [-.025,.205,-.101], [-.036,.255,-.067], [-.041,.096,.043], [.041,.096,.043], [-.042,.096,-.079], [.042,.096,-.079]])
PARENTS = [None,0,0,2,3,0,0,0,0]


def load(path):
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA:
        raise ValueError("This calibration is for the original October 24 panda export only.")
    magic, version, size = struct.unpack_from("<III", raw)
    assert magic == 0x46546c67 and version == 2 and size == len(raw)
    length, kind = struct.unpack_from("<II", raw, 12)
    assert kind == 0x4e4f534a
    doc = json.loads(raw[20:20+length])
    binary = raw[28+length:]

    def accessor(index):
        a = doc["accessors"][index]
        v = doc["bufferViews"][a["bufferView"]]
        assert "byteStride" not in v and "sparse" not in a
        dtype = {5126:"<f4",5125:"<u4",5123:"<u2"}[a["componentType"]]
        columns = {"SCALAR":1,"VEC2":2,"VEC3":3}[a["type"]]
        return np.frombuffer(binary, dtype=dtype, count=a["count"]*columns,
                             offset=v.get("byteOffset",0)+a.get("byteOffset",0)).reshape(-1,columns).copy()
    p = doc["meshes"][0]["primitives"][0]
    positions = accessor(p["attributes"]["POSITION"])
    uv = accessor(p["attributes"]["TEXCOORD_0"])
    triangles = accessor(p["indices"]).reshape(-1,3)
    textures = []
    for image in doc["images"]:
        v = doc["bufferViews"][image["bufferView"]]
        data = binary[v.get("byteOffset",0):v.get("byteOffset",0)+v["byteLength"]]
        textures.append(Image.open(io.BytesIO(data)).convert("RGB"))
    return raw, positions.astype(float), uv.astype(float), triangles, textures


def clip_polygon(poly, normal, offset):
    """Half-space clipping interpolates UVs at the exact tabletop cut."""
    out = []
    for a,b in zip(poly, poly[1:]+poly[:1]):
        da, db = np.dot(a[:3],normal)+offset, np.dot(b[:3],normal)+offset
        if da >= -1e-10:
            out.append(a)
        if (da < 0) != (db < 0):
            out.append(a+(b-a)*(da/(da-db)))
    return out


def subtract_volume(poly, planes):
    remaining=poly;outside=[]
    for normal,offset in planes:
        if len(remaining)<3:break
        piece=clip_polygon(remaining,-normal,-offset)
        if len(piece)>=3:outside.append(piece)
        remaining=clip_polygon(remaining,normal,offset)
    return outside


def extract(positions, uv, triangles, color):
    planes = [(np.array([1,0,0]),.11), (np.array([-1,0,0]),.18),
              (np.array([0,0,1]),-.05), (np.array([0,0,-1]),.34),
              (np.array([-TABLE[0],1,-TABLE[1]]),-TABLE[2]-.003)]
    rows, faces, lookup = [], [], {}
    data = np.c_[positions,uv]
    centres = positions[triangles].mean(1)
    candidates = triangles[(centres[:,0]>-.12)&(centres[:,0]<.19)&(centres[:,2]>.04)&(centres[:,2]<.35)]
    for tri in candidates:
        poly = list(data[tri])
        for normal,offset in planes:
            if len(poly) < 3:
                break
            poly = clip_polygon(poly,normal,offset)
        if len(poly)<3:
            continue
        ids=[]
        for row in poly:
            key=tuple(np.round(row,8))
            if key not in lookup:
                lookup[key]=len(rows);rows.append(row)
            ids.append(lookup[key])
        for i in range(1,len(ids)-1):
            faces.append([ids[0],ids[i],ids[i+1]])
    rows=np.array(rows);faces=np.array(faces,dtype=np.int32)
    v=rows[:,:3].copy();tex=rows[:,3:]
    v[:,1]-=v[:,0]*TABLE[0]+v[:,2]*TABLE[1]+TABLE[2]
    v-=CENTRE
    yaw=math.pi/4
    rotation=np.array([[math.cos(yaw),0,math.sin(yaw)],[0,1,0],[-math.sin(yaw),0,math.cos(yaw)]])
    v=v@rotation.T
    c=v[faces].mean(1)
    tuv=tex[faces].mean(1)
    pixels=np.array(color)[np.clip((tuv[:,1]*color.height).astype(int),0,color.height-1),np.clip((tuv[:,0]*color.width).astype(int),0,color.width-1)].astype(float)
    # Scan bridges occupy the air between the actual four brown legs. Restrict
    # these edits to below the real belly, preserving white face/tail details.
    pale_bridge=(c[:,1]<.057)&(c[:,2]<.083)&(pixels[:,0]<pixels[:,1]*1.25)
    keep=~pale_bridge
    faces=faces[keep]
    # Subtract two measured air gaps with true polygon clipping, rather than
    # leaving jagged triangles along the paws and underside.
    voids=[[(np.array([0,-1,0]),.052),(np.array([0,0,1]),.049),(np.array([0,0,-1]),.012)],
           [(np.array([0,-1,0]),.034),(np.array([1,0,0]),.017),(np.array([-1,0,0]),.017)]]
    new_rows=[];new_faces=[];keys={};canonical=np.c_[v,tex]
    for tri in faces:
        polygons=[list(canonical[tri])]
        for volume in voids:
            polygons=[p for polygon in polygons for p in subtract_volume(polygon,volume)]
        for polygon in polygons:
            ids=[]
            for point in polygon:
                key=tuple(np.round(point,8))
                if key not in keys:keys[key]=len(new_rows);new_rows.append(point)
                ids.append(keys[key])
            new_faces.extend([[ids[0],ids[i],ids[i+1]] for i in range(1,len(ids)-1)])
    new_rows=np.array(new_rows);v=new_rows[:,:3];tex=new_rows[:,3:];faces=np.array(new_faces,dtype=np.int32)
    area=np.linalg.norm(np.cross(v[faces[:,1]]-v[faces[:,0]],v[faces[:,2]]-v[faces[:,0]]),axis=1)
    faces=faces[area>1e-10]
    return v,tex,faces


def components(count, faces):
    parent=np.arange(count)
    def find(a):
        while parent[a]!=a:
            parent[a]=parent[parent[a]];a=parent[a]
        return a
    for a,b,c in faces:
        root=find(a);parent[find(b)]=root;parent[find(c)]=root
    return np.array([find(a) for a in faces[:,0]])


def repack(uv, faces, textures, out):
    labels=components(len(uv),faces)
    charts=[]
    for label in np.unique(labels):
        ids=np.unique(faces[labels==label])
        lo=np.floor(uv[ids].min(0)*4096).astype(int)-PAD
        hi=np.ceil(uv[ids].max(0)*4096).astype(int)+PAD
        charts.append(dict(label=int(label),ids=ids,lo=lo,size=hi-lo))
    charts.sort(key=lambda c:(-c["size"][1],-c["size"][0],c["label"]))
    # Deterministic shelf packing at original texel density, with safe gutters.
    x=y=row=0
    for chart in charts:
        w,h=chart["size"]
        if x+w>ATLAS:
            x=0;y+=row;row=0
        if y+h>ATLAS or w>ATLAS:
            raise ValueError("Atlas packing exceeded 2048px; revise chart packing.")
        chart["at"]=(x,y);x+=w;row=max(row,h)
    mapped=np.zeros_like(uv)
    atlases=[Image.new("RGB",(ATLAS,ATLAS),c) for c in [(128,128,255),(255,255,255),(48,20,8)]]
    used=0
    for chart in charts:
        label,ids,lo,size,at=chart["label"],chart["ids"],chart["lo"],chart["size"],chart["at"]
        w,h=map(int,size);left,top=map(int,lo)
        mask=Image.new("L",(w,h));draw=ImageDraw.Draw(mask)
        for tri in faces[labels==label]:
            draw.polygon([tuple(p) for p in uv[tri]*4096-lo],fill=255)
        valid=np.array(mask)>0;used+=int(valid.sum())
        mapped[ids]=(uv[ids]*4096-lo+np.array(at))/ATLAS
        for k,texture in enumerate(textures):
            tile=np.array(texture.crop((left,top,left+w,top+h)))
            tile[~valid]=[(128,128,255),(255,255,255),(48,20,8)][k]
            active=valid.copy()
            for _ in range(PAD-1):
                # Extend only retained panda texels. Never copy neighbouring
                # table pixels into new padding or the unused texture space.
                for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:
                    sy=slice(max(0,-dy),min(h,h-dy));sx=slice(max(0,-dx),min(w,w-dx))
                    ty=slice(max(0,dy),min(h,h+dy));tx=slice(max(0,dx),min(w,w+dx))
                    fill=active[sy,sx]&~active[ty,tx]
                    target=tile[ty,tx];target[fill]=tile[sy,sx][fill];active[ty,tx]|=fill
            atlases[k].paste(Image.fromarray(tile),at)
    images=[]
    for k,atlas in enumerate(atlases):
        if k<2:atlas=atlas.resize((1024,1024),Image.Resampling.LANCZOS)
        stream=io.BytesIO();fmt="PNG" if k==0 else "JPEG"
        atlas.save(stream,format=fmt,**({"compress_level":6} if k==0 else {"quality":94,"subsampling":0}))
        images.append((stream.getvalue(),"image/png" if k==0 else "image/jpeg"))
        atlas.save(out/f"panda-atlas-{k}.png")
    return mapped,images,len(charts),used


def part_ids(v,faces):
    c=v[faces].mean(1);x,y,z=c.T
    p=np.zeros(len(faces),dtype=int)
    p[(z>.071)&(y>.040)]=1
    tail=(z<-.062)&(y>.124)&(np.abs(x)<.044)
    p[tail]=2;p[tail&(y>.203)]=3;p[tail&(y>.253)]=4
    legs=(y<.101)&(np.abs(x)>.019)&(p==0)
    p[legs&(z>.014)&(x<0)]=5;p[legs&(z>.014)&(x>=0)]=6
    p[legs&(z<-.041)&(x<0)]=7;p[legs&(z<-.041)&(x>=0)]=8
    return p


class GLB:
    def __init__(self):
        self.bin=bytearray();self.doc={"asset":{"version":"2.0","generator":"Hollow Court panda preparation"},"scene":0,"scenes":[{"nodes":[0]}],"nodes":[],"meshes":[],"accessors":[],"bufferViews":[],"materials":[],"animations":[]}
    def data(self,raw,target=None):
        self.bin.extend(b"\0"*((-len(self.bin))%4));offset=len(self.bin);self.bin.extend(raw)
        view={"buffer":0,"byteOffset":offset,"byteLength":len(raw)}
        if target:view["target"]=target
        self.doc["bufferViews"].append(view);return len(self.doc["bufferViews"])-1
    def accessor(self,a,kind,indices=False):
        a=np.asarray(a,dtype="<u4" if indices else "<f4");view=self.data(a.tobytes(),34963 if indices else 34962)
        obj={"bufferView":view,"componentType":5125 if indices else 5126,"count":len(a),"type":kind}
        if kind=="VEC3":obj.update(min=a.min(0).tolist(),max=a.max(0).tolist())
        if kind=="SCALAR" and not indices:obj.update(min=[float(a.min())],max=[float(a.max())])
        self.doc["accessors"].append(obj);return len(self.doc["accessors"])-1
    def write(self,path):
        self.doc["buffers"]=[{"byteLength":len(self.bin)}]
        text=json.dumps(self.doc,separators=(",",":"),allow_nan=False).encode();text+=b" "*((-len(text))%4)
        binary=bytes(self.bin);binary+=b"\0"*((-len(binary))%4)
        raw=struct.pack("<III",0x46546c67,2,28+len(text)+len(binary))+struct.pack("<II",len(text),0x4e4f534a)+text+struct.pack("<II",len(binary),0x004e4942)+binary
        path.write_bytes(raw);return raw


def normals(v,faces):
    # Share smooth normals across duplicated UV seams without changing UVs.
    _,weld=np.unique(np.round(v,6),axis=0,return_inverse=True)
    sums=np.zeros((int(weld.max())+1,3))
    face=np.cross(v[faces[:,1]]-v[faces[:,0]],v[faces[:,2]]-v[faces[:,0]])
    for i in range(3):np.add.at(sums,weld[faces[:,i]],face)
    length=np.linalg.norm(sums,axis=1);sums/=np.maximum(length,1e-12)[:,None]
    return sums[weld]


def joint_caps(v,faces):
    """Close small part-joint/sole openings; leave large uncertain scan holes."""
    points,weld=np.unique(np.round(v,6),axis=0,return_inverse=True)
    f=weld[faces];edges=Counter();directions={}
    for tri in f:
        for a,b in zip(tri,np.roll(tri,-1)):
            if a==b:continue
            key=tuple(sorted((int(a),int(b))));edges[key]+=1;directions[key]=(int(a),int(b))
    boundary={directions[e] for e,n in edges.items() if n==1}
    nexts=defaultdict(list)
    for a,b in boundary:nexts[a].append(b)
    visited=set();caps=[]
    for a,b in sorted(boundary):
        if (a,b) in visited:continue
        loop=[a];current=a;closed=False
        for _ in range(len(boundary)+1):
            options=[n for n in nexts[current] if (current,n) not in visited]
            if len(options)!=1:break
            nxt=options[0];visited.add((current,nxt));loop.append(nxt);current=nxt
            if current==a:closed=True;break
        if not closed or len(loop)<4:continue
        ring=points[loop[:-1]];extent=np.ptp(ring,axis=0)
        if extent.max()>.105:continue
        # Avoid filling the open space under the belly after removing bridges.
        sole=np.ptp(ring[:,1])<.001 and ring[:,1].mean()<.007
        joint=ring[:,1].mean()>.055
        if not (sole or joint):continue
        centre=ring.mean(0)
        for x,y in zip(ring,np.roll(ring,-1,axis=0)):
            if np.linalg.norm(np.cross(x-centre,y-centre))>1e-10:caps.append([y,x,centre])
    return np.array(caps).reshape(-1,3,3)


def quat(x=0,y=0,z=0):
    # XYZ Euler convention, glTF x/y/z/w quaternion order.
    sx,cx=math.sin(x/2),math.cos(x/2);sy,cy=math.sin(y/2),math.cos(y/2);sz,cz=math.sin(z/2),math.cos(z/2)
    return [sx*cy*cz+cx*sy*sz,cx*sy*cz-sx*cy*sz,cx*cy*sz+sx*sy*cz,cx*cy*cz-sx*sy*sz]


def animations(g):
    for name,duration in [("Survey",3.2),("Run",.64),("Settle",.8),("Greet",3.2)]:
        times=np.linspace(0,duration,49 if name=="Survey" else 25)
        animation={"name":name,"samplers":[],"channels":[]}
        time_accessor=g.accessor(times,"SCALAR")
        for node in range(len(PARTS)):
            rotations=[]
            for time in times:
                t=time/duration;wave=math.sin(t*2*math.pi);turn=math.cos(t*2*math.pi)
                x=y=z=0
                if name in ["Survey","Greet"]:
                    if node==1:y=.10*wave;z=.055*turn;x=-.20+.025*math.sin(t*4*math.pi)
                    if node==2:z=.055*wave;y=.07*wave
                    if node==3:x=.075*math.sin(t*2*math.pi+.4)
                    if node==4:z=.06*math.sin(t*2*math.pi+.8)
                if name=="Run":
                    if node in [5,8]:x=.48*wave
                    if node in [6,7]:x=-.48*wave
                    if node==1:z=.035*wave;x=-.18
                    if node==2:y=.18*wave;z=.08*turn
                    if node==3:x=.08*turn
                if name in ["Settle","Greet"]:
                    sit=t*t*(3-2*t) if name=="Settle" else 1
                    if node in [7,8]:x=-.28*sit
                    if node==1:x=(-.20+.04*sit) if name=="Settle" else x+.04*sit
                rotations.append(quat(x,y,z))
            accessor=g.accessor(rotations,"VEC4");animation["samplers"].append({"input":time_accessor,"output":accessor,"interpolation":"LINEAR"})
            animation["channels"].append({"sampler":len(animation["samplers"])-1,"target":{"node":node,"path":"rotation"}})
        g.doc["animations"].append(animation)


def export(v,uv,faces,labels,images,path):
    g=GLB()
    g.doc["materials"]=[{"name":"Panda original surface","normalTexture":{"index":0,"scale":.45},"occlusionTexture":{"index":1,"strength":.15},"pbrMetallicRoughness":{"baseColorTexture":{"index":2},"metallicFactor":0,"roughnessFactor":.78},"doubleSided":True}]
    for name,color in [("Orange joint",[.65,.12,.018,1]),("Brown joint",[.28,.075,.021,1]),("White joint",[.86,.84,.79,1])]:
        g.doc["materials"].append({"name":name,"pbrMetallicRoughness":{"baseColorFactor":color,"metallicFactor":0,"roughnessFactor":.9},"doubleSided":True})
    g.doc["images"]=[{"bufferView":g.data(data),"mimeType":mime} for data,mime in images]
    g.doc["textures"]=[{"sampler":0,"source":i} for i in range(3)]
    g.doc["samplers"]=[{"wrapS":33071,"wrapT":33071,"magFilter":9729,"minFilter":9987}]
    vn=normals(v,faces)
    for part,name in enumerate(PARTS):
        f=faces[labels==part];ids,indices=np.unique(f,return_inverse=True)
        assert len(f)>0,name
        position=v[ids]-PIVOTS[part]
        primitives=[{"attributes":{"POSITION":g.accessor(position,"VEC3"),"NORMAL":g.accessor(vn[ids],"VEC3"),"TEXCOORD_0":g.accessor(uv[ids],"VEC2")},"indices":g.accessor(indices.reshape(-1),"SCALAR",True),"material":0}]
        caps=joint_caps(v,f)
        if len(caps):
            normals_cap=np.cross(caps[:,1]-caps[:,0],caps[:,2]-caps[:,0]);normals_cap/=np.maximum(np.linalg.norm(normals_cap,axis=1)[:,None],1e-10)
            primitives.append({"attributes":{"POSITION":g.accessor((caps-PIVOTS[part]).reshape(-1,3),"VEC3"),"NORMAL":g.accessor(np.repeat(normals_cap,3,axis=0),"VEC3")},"material":3 if part in [2,3,4] else 2 if part>=5 or part==0 else 1})
        g.doc["meshes"].append({"name":"Panda"+name,"primitives":primitives})
        translation=PIVOTS[part]-(PIVOTS[PARENTS[part]] if PARENTS[part] is not None else 0)
        node={"name":"Panda"+name,"mesh":part,"translation":translation.tolist()}
        children=[i for i,p in enumerate(PARENTS) if p==part]
        if children:node["children"]=children
        g.doc["nodes"].append(node)
    g.doc["scenes"][0]["extras"]={"guardian":"BUY-03","rig":"red-panda-rigid-v1"}
    animations(g)
    return g.write(path)


def main():
    ap=argparse.ArgumentParser();ap.add_argument("source",type=Path);ap.add_argument("output",type=Path);args=ap.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    raw,v,uv,tri,textures=load(args.source)
    v,uv,tri=extract(v,uv,tri,textures[2]);mapped,images,charts,used=repack(uv,tri,textures,args.output)
    parts=part_ids(v,tri)
    result=export(v,mapped,tri,parts,images,args.output/"RedPanda.glb")
    result_doc=json.loads(result[20:20+struct.unpack_from('<I',result,12)[0]])
    actual_triangles=sum(result_doc['accessors'][p.get('indices',p['attributes']['POSITION'])]['count']//3 for mesh in result_doc['meshes'] for p in mesh['primitives'])
    metrics={"sourceSha256":SOURCE_SHA,"sourceBytes":len(raw),"sourceTriangles":49999,"sourceTextureSizes":[[4096,4096]]*3,"outputSha256":hashlib.sha256(result).hexdigest(),"outputBytes":len(result),"triangles":actual_triangles,"surfaceTriangles":len(tri),"surfaceVertices":len(np.unique(tri)),"bounds":[v[tri].min((0,1)).tolist(),v[tri].max((0,1)).tolist()],"textureSizes":[[1024,1024],[1024,1024],[2048,2048]],"uvCharts":charts,"retainedSourceTexels":used,"parts":{name:int((parts==i).sum()) for i,name in enumerate(PARTS)},"clips":["Survey","Run","Settle","Greet"],"tablePlaneY":TABLE.tolist(),"tableClearanceMetres":.003}
    (args.output/"metrics.json").write_text(json.dumps(metrics,indent=2)+"\n")
    np.savez(args.output/"extracted.npz",vertices=v,uv=mapped,triangles=tri,parts=parts)
    print(json.dumps(metrics,indent=2))


if __name__=="__main__":main()
