"""Convert locally extracted native Lux SKN/SKL/ANM/TEX to wallpaper glTF.

Requires the GPL-3.0 lol2gltf converter from https://github.com/Crauzer/lol2gltf.
Uses only the skin's initially visible geometry and the actual idle/run clips.
"""
from pathlib import Path
import argparse,base64,json,os,shutil,struct,subprocess
ROOT=Path(__file__).resolve().parent.parent

def optimize(source:Path,target:Path):
    raw=source.read_bytes()
    json_size,=struct.unpack_from('<I',raw,12)
    doc=json.loads(raw[20:20+json_size])
    binary=raw[28+json_size:]
    names=['Body','Weapons','Face_Basic','Face_Basic_Eyes']
    primitives=doc['meshes'][0]['primitives']
    selected=[next(p for p in primitives if doc['materials'][p['material']]['name']==n) for n in names]
    doc['meshes'][0]['primitives']=selected
    material_ids=[p['material'] for p in selected]
    doc['materials']=[doc['materials'][i] for i in material_ids]
    for i,p in enumerate(selected): p['material']=i
    for material in doc['materials']:
        material['pbrMetallicRoughness'].update({'metallicFactor':0,'roughnessFactor':1})
        if material['name'].startswith('Face_'):
            material['alphaMode']='BLEND'
    accessor_ids=set()
    for p in selected:
        accessor_ids.add(p['indices']);accessor_ids.update(p['attributes'].values())
    for skin in doc['skins']:accessor_ids.add(skin['inverseBindMatrices'])
    for anim in doc['animations']:
        for sampler in anim['samplers']:accessor_ids.update([sampler['input'],sampler['output']])
    accessor_ids=sorted(accessor_ids)
    accessor_map={old:new for new,old in enumerate(accessor_ids)}
    doc['accessors']=[doc['accessors'][i] for i in accessor_ids]
    for p in selected:
        p['indices']=accessor_map[p['indices']]
        p['attributes']={k:accessor_map[v] for k,v in p['attributes'].items()}
    for skin in doc['skins']:skin['inverseBindMatrices']=accessor_map[skin['inverseBindMatrices']]
    for anim in doc['animations']:
        for sampler in anim['samplers']:
            sampler['input']=accessor_map[sampler['input']];sampler['output']=accessor_map[sampler['output']]
    view_ids=sorted({a['bufferView'] for a in doc['accessors']}|{i['bufferView'] for i in doc['images']})
    view_map={old:new for new,old in enumerate(view_ids)}
    views=[];out=bytearray()
    for i in view_ids:
        view=dict(doc['bufferViews'][i]);offset=view.get('byteOffset',0)
        out.extend(b'\0'*((-len(out))%4))
        view['byteOffset']=len(out)
        out.extend(binary[offset:offset+view['byteLength']]);views.append(view)
    for item in doc['accessors']+doc['images']:item['bufferView']=view_map[item['bufferView']]
    doc['bufferViews']=views;doc['buffers']=[{'byteLength':len(out)}]
    doc['asset']['copyright']='Chibi Star Guardian Lux model, textures, and animations © Riot Games. Extracted from the user\u2019s local TFT installation.'
    doc['extras']={'sourceCompanion':'PetChibiLux StarGuardian Tier1','upAxis':'+Y','forwardAxis':'+Z','sourceMovement':'petchibilux_starguardian_run.anm','clips':{'Idle':1.9666668,'Walk':0.73333335},'visibleSubmeshes':names,'bodyBindBounds':{'min':[-78.797348,-0.312776,-54.294701],'max':[78.797348,166.343399,37.922932]}}
    encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
    out+=b'\0'*((-len(out))%4)
    result=struct.pack('<III',0x46546C67,2,28+len(encoded)+len(out))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+struct.pack('<II',len(out),0x004E4942)+out
    target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(result)
    print(json.dumps({'file':str(target),'bytes':len(result),'animations':doc['extras']['clips'],'vertices':sum(doc['accessors'][p['attributes']['POSITION']]['count'] for p in selected)},indent=2))

def convert(converter:Path,extracted:Path,output:Path):
    theme=extracted/'assets/characters/petchibilux/themes/starguardian'
    loops=ROOT/'.sources/lux/loop-animations';loops.mkdir(parents=True,exist_ok=True)
    for name,source in [('Idle','idle'),('Walk','run')]: shutil.copyfile(theme/f'animations/petchibilux_starguardian_{source}.anm',loops/f'{name}.anm')
    raw=ROOT/'.sources/lux/textured.glb'
    args=[str(converter),'skn2gltf','-m',str(theme/'tier1/petchibilux_starguardian_tier1.skn'),'-s',str(theme/'tier1/petchibilux_starguardian_tier1.skl'),'-g',str(raw),'-a',str(loops),'--materials','Body','Face_Basic_Eyes','Face_Basic','Weapons','--textures',str(theme/'petchibilux_starguardian_tx_cm.tex'),str(theme/'petchibilux_starguardian_eyes_tx_cm.tex'),str(theme/'petchibilux_starguardian_eyes_tx_cm.tex'),str(theme/'petchibilux_starguardian_pet_tx_cm.tex')]
    env=dict(os.environ);env['DOTNET_ROLL_FORWARD']='Major'
    subprocess.run(args,env=env,check=True)
    optimize(raw,output)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--converter',type=Path,default=ROOT/'.tools/lol2gltf.exe')
    parser.add_argument('--extracted',type=Path,default=ROOT/'.sources/lux/extracted')
    parser.add_argument('--output',type=Path,default=ROOT/'wallpaper/media/lux/star-guardian-lux.glb')
    args=parser.parse_args();convert(args.converter,args.extracted,args.output)
