"""Measure native Lux skeleton landmarks in glTF coordinates for route tuning."""
from pathlib import Path
import json,struct,numpy as np
ROOT=Path(__file__).resolve().parent.parent

def read_glb(path):
 d=path.read_bytes();length=struct.unpack_from('<I',d,12)[0];return json.loads(d[20:20+length]),d[28+length:]
def values(doc,binary,index):
 a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt={5126:'f',5123:'H',5125:'I'}[a['componentType']];stride=v.get('byteStride',struct.calcsize(fmt)*size);off=v.get('byteOffset',0)+a.get('byteOffset',0)
 return np.array([struct.unpack_from('<'+fmt*size,binary,off+i*stride) for i in range(a['count'])])
def matrix(t,q,s):
 x,y,z,w=q/np.linalg.norm(q)
 m=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w,0],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w,0],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y,0],[0,0,0,1]],dtype=float)
 m[:3,:3]*=s;m[:3,3]=t;return m

def measure(path,clip):
 doc,binary=read_glb(path);anim=next(a for a in doc['animations'] if a['name']==clip);tracks=[]
 for ch in anim['channels']:
  sampler=anim['samplers'][ch['sampler']];tracks.append((ch['target']['node'],ch['target']['path'],values(doc,binary,sampler['input'])[:,0],values(doc,binary,sampler['output'])))
 duration=max(t[2][-1] for t in tracks);steps=int(round(duration*30))+1;result=[]
 for time in np.linspace(0,duration,steps):
  local=[{'translation':np.array(n.get('translation',[0,0,0])),'rotation':np.array(n.get('rotation',[0,0,0,1])),'scale':np.array(n.get('scale',[1,1,1]))} for n in doc['nodes']]
  for node,prop,times,vals in tracks:
   i=max(0,min(len(times)-1,np.searchsorted(times,time,side='right')-1));k=min(i+1,len(times)-1);fraction=(time-times[i])/(times[k]-times[i]) if k!=i else 0
   end=vals[k]
   if prop=='rotation' and np.dot(vals[i],end)<0:end=-end
   local[node][prop]=vals[i]*(1-fraction)+end*fraction
  world={}
  def visit(index,parent):
   item=local[index];world[index]=parent@matrix(item['translation'],item['rotation'],item['scale'])
   for child in doc['nodes'][index].get('children',[]):visit(child,world[index])
  for index in doc['scenes'][0]['nodes']:visit(index,np.eye(4))
  sample={'time':round(float(time),6)}
  for index,n in enumerate(doc['nodes']):
   if n['name'] in ['Root','R_Foot','L_Foot','R_Toe','L_Toe','Buffbone_Glb_Ground_Loc']:
    sample[n['name']]=[round(float(x),5) for x in world[index][:3,3]]
  result.append(sample)
 return result

if __name__=='__main__':
 p=ROOT/'wallpaper/media/lux/star-guardian-lux.glb';report={name:measure(p,name) for name in ['Idle','IdleIn','Run']};target=ROOT/'.sources/lux/motion-landmarks.json';target.write_text(json.dumps(report,indent=2))
 for s in report['Run']:print(s['time'],'Root',s['Root'],'Ltoe',s['L_Toe'],'Rtoe',s['R_Toe'])
