"""Convert native Lux SKN/SKL/ANM/TEX into an animated wallpaper glTF.

Requires lol2gltf (GPL-3.0): https://github.com/Crauzer/lol2gltf.
Source event metadata was decoded from the installed StarGuardian animation BIN.
All expression/Pet geometry is retained for the native emote visibility events.
"""
from pathlib import Path
import argparse,copy,hashlib,json,os,shutil,struct,subprocess
ROOT=Path(__file__).resolve().parent.parent
DATA=ROOT/'scripts/data/lux-native-animation-data.json'
NAMES=['Body','Weapons','Pet','Face_Basic','Face_Rainbow','Anger','Happy','Surprise','Sneeze','Wacky','Eyesclosed','Face_Basic_Eyes','Surprise_Eyes']

def elf_hash(name):
    value=0
    for char in name.lower().encode():
        value=(value<<4)+char
        high=value&0xf0000000
        if high: value^=high>>24
        value&=~high
    return f'{value:08x}'

def correct_native_endpoints(source:Path,endpoints:Path,target:Path):
    """Keep the native duration and endpoint omitted by upstream frame sampling."""
    raw=source.read_bytes();length=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+length]);binary=bytearray(raw[28+length:]);native=json.loads(endpoints.read_text())
    def append_accessor(index,value):
        original=doc['accessors'][index];view=doc['bufferViews'][original['bufferView']]
        count={'SCALAR':1,'VEC3':3,'VEC4':4}[original['type']];stride=view.get('byteStride',count*4)
        start=view.get('byteOffset',0)+original.get('byteOffset',0)
        payload=b''.join(binary[start+i*stride:start+i*stride+count*4] for i in range(original['count']))+struct.pack('<'+'f'*count,*value)
        binary.extend(b'\0'*((-len(binary))%4));new_view={'buffer':0,'byteOffset':len(binary),'byteLength':len(payload)};binary.extend(payload)
        doc['bufferViews'].append(new_view);accessor=dict(original);accessor['bufferView']=len(doc['bufferViews'])-1;accessor.pop('byteOffset',None);accessor['count']+=1
        if 'min' in accessor: accessor['min']=[min(a,b) for a,b in zip(accessor['min'],value)]
        if 'max' in accessor: accessor['max']=[max(a,b) for a,b in zip(accessor['max'],value)]
        doc['accessors'].append(accessor);return len(doc['accessors'])-1
    for animation in doc['animations']:
        clip=native[animation['name']];duration=clip['duration']
        for channel in animation['channels']:
            sampler=animation['samplers'][channel['sampler']];node=doc['nodes'][channel['target']['node']]['name']
            pose=clip['joints'][elf_hash(node)];property_name=channel['target']['path']
            sampler['input']=append_accessor(sampler['input'],[duration])
            sampler['output']=append_accessor(sampler['output'],pose[property_name])
    doc['buffers'][0]['byteLength']=len(binary)
    encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary+=b'\0'*((-len(binary))%4)
    target.write_bytes(struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary)

def evaluate_native_endpoints(folder:Path):
    project=ROOT/'.sources/lux/EndpointReader';project.mkdir(parents=True,exist_ok=True)
    source=ROOT/'scripts/extract_lux_endpoints.cs'
    (project/'Program.cs').write_text(source.read_text())
    (project/'EndpointReader.csproj').write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><RestorePackagesPath>'+str(ROOT/'.tools/nuget')+'</RestorePackagesPath></PropertyGroup><ItemGroup><PackageReference Include="LeagueToolkit" Version="4.1.0-beta.53" /></ItemGroup></Project>')
    output=ROOT/'.sources/lux/native-endpoints.json'
    env=dict(os.environ);env['DOTNET_CLI_TELEMETRY_OPTOUT']='1';env['DOTNET_NOLOGO']='1'
    subprocess.run(['dotnet','run','--project',str(project/'EndpointReader.csproj'),'--',str(folder),str(output)],check=True,env=env)
    return output

def optimize(source:Path,target:Path,metadata):
    raw=source.read_bytes()
    json_size,=struct.unpack_from('<I',raw,12)
    doc=json.loads(raw[20:20+json_size]);binary=raw[28+json_size:]
    primitives=doc['meshes'][0]['primitives']
    selected=[next(p for p in primitives if doc['materials'][p['material']]['name']==n) for n in NAMES]
    doc['meshes'][0]['primitives']=selected
    doc['materials']=[doc['materials'][p['material']] for p in selected]
    for i,(primitive,material) in enumerate(zip(selected,doc['materials'])):
        primitive['material']=i
        primitive['extras']={'nativeSubmeshName':material['name'],'initiallyVisible':material['name'] in metadata['initialVisible']}
        material['pbrMetallicRoughness'].update({'metallicFactor':0,'roughnessFactor':1})
        if material['name'] not in ['Body','Weapons','Pet']: material['alphaMode']='BLEND'
    animations={a['name']:a for a in doc['animations']}
    runtime=copy.deepcopy(metadata)
    for name,clip in runtime['clips'].items():
        animation=animations[name]
        duration=max(doc['accessors'][sampler['input']]['max'][0] for sampler in animation['samplers'])
        clip['duration']=duration
        for kind in ['visibility','effects','sounds']:
            for event in clip[kind]:
                event['start']=event['startFrame']/runtime['eventFramesPerSecond']
                event['end']=event['endFrame']/runtime['eventFramesPerSecond'] if event['endFrame'] is not None else duration
        animation['extras']={'nativeAnimation':clip['sourceAnimation'],'nativeGraphClipHash':clip['graphClipHash'],'loop':clip['loop'],'visibility':clip['visibility']}
    accessor_ids=set()
    for p in selected:accessor_ids.add(p['indices']);accessor_ids.update(p['attributes'].values())
    for skin in doc['skins']:accessor_ids.add(skin['inverseBindMatrices'])
    for anim in doc['animations']:
        for sampler in anim['samplers']:accessor_ids.update([sampler['input'],sampler['output']])
    accessor_ids=sorted(accessor_ids);accessor_map={old:new for new,old in enumerate(accessor_ids)}
    doc['accessors']=[doc['accessors'][i] for i in accessor_ids]
    for p in selected:
        p['indices']=accessor_map[p['indices']];p['attributes']={k:accessor_map[v] for k,v in p['attributes'].items()}
    for skin in doc['skins']:skin['inverseBindMatrices']=accessor_map[skin['inverseBindMatrices']]
    for anim in doc['animations']:
        for sampler in anim['samplers']:
            sampler['input']=accessor_map[sampler['input']];sampler['output']=accessor_map[sampler['output']]
    view_ids=sorted({a['bufferView'] for a in doc['accessors']}|{i['bufferView'] for i in doc['images']})
    view_map={};views=[];out=bytearray();cached={}
    for i in view_ids:
        view=dict(doc['bufferViews'][i]);offset=view.get('byteOffset',0);payload=binary[offset:offset+view['byteLength']]
        key=(hashlib.sha256(payload).digest(),view.get('byteStride'),view.get('target'))
        if key not in cached:
            out.extend(b'\0'*((-len(out))%4));view['byteOffset']=len(out);out.extend(payload)
            cached[key]=len(views);views.append(view)
        view_map[i]=cached[key]
    for item in doc['accessors']+doc['images']:item['bufferView']=view_map[item['bufferView']]
    doc['bufferViews']=views;doc['buffers']=[{'byteLength':len(out)}]
    doc['asset']['copyright']='Chibi Star Guardian Lux model, textures, and animations © Riot Games. Extracted from the user\u2019s local TFT installation.'
    doc['extras']={'sourceCompanion':'PetChibiLux StarGuardian Tier1','upAxis':'+Y','forwardAxis':'+Z','sourceMovement':'petchibilux_starguardian_run.anm','clips':{n:c['duration'] for n,c in runtime['clips'].items()},'initialVisibleSubmeshes':metadata['initialVisible'],'bodyBindBounds':{'min':[-78.797348,-0.312776,-54.294701],'max':[78.797348,166.343399,37.922932]}}
    encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);out+=b'\0'*((-len(out))%4)
    result=struct.pack('<III',0x46546C67,2,28+len(encoded)+len(out))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+struct.pack('<II',len(out),0x004E4942)+out
    target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(result)
    (target.parent/'animation-data.json').write_text(json.dumps(runtime,indent=2),encoding='utf8')
    (target.parent/'animation-data.js').write_text('window.LUX_ANIMATION_DATA = '+json.dumps(runtime,separators=(',',':'))+';\n',encoding='utf8')
    print(json.dumps({'file':str(target),'bytes':len(result),'animations':doc['extras']['clips'],'vertices':sum(doc['accessors'][p['attributes']['POSITION']]['count'] for p in selected),'bufferViewsBefore':len(view_ids),'bufferViewsAfter':len(views)},indent=2))

def convert(converter:Path,extracted:Path,output:Path):
    theme=extracted/'assets/characters/petchibilux/themes/starguardian'
    metadata=json.loads(DATA.read_text())
    loops=ROOT/'.sources/lux/native-animations-v2';loops.mkdir(parents=True,exist_ok=True)
    for name,clip in metadata['clips'].items():shutil.copyfile(theme/'animations'/clip['sourceAnimation'],loops/f'{name}.anm')
    raw=ROOT/'.sources/lux/native-textured.glb'
    texture_paths=[str(theme/('petchibilux_starguardian_tx_cm.tex' if n=='Body' else 'petchibilux_starguardian_pet_tx_cm.tex' if n in ['Pet','Weapons'] else 'petchibilux_starguardian_eyes_tx_cm.tex')) for n in NAMES]
    args=[str(converter),'skn2gltf','-m',str(theme/'tier1/petchibilux_starguardian_tier1.skn'),'-s',str(theme/'tier1/petchibilux_starguardian_tier1.skl'),'-g',str(raw),'-a',str(loops),'--materials',*NAMES,'--textures',*texture_paths]
    env=dict(os.environ);env['DOTNET_ROLL_FORWARD']='Major';subprocess.run(args,env=env,check=True)
    endpoints=evaluate_native_endpoints(loops)
    timed=ROOT/'.sources/lux/native-timed.glb'
    correct_native_endpoints(raw,endpoints,timed)
    optimize(timed,output,metadata)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--converter',type=Path,default=ROOT/'.tools/lol2gltf.exe')
    parser.add_argument('--extracted',type=Path,default=ROOT/'.sources/lux/extracted')
    parser.add_argument('--output',type=Path,default=ROOT/'wallpaper/media/lux/star-guardian-lux.glb')
    args=parser.parse_args();convert(args.converter,args.extracted,args.output)
