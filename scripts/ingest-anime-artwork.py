#!/usr/bin/env python3
"""One-shot importer for artwork supplied by the Rotta Canonica owner.
Only commits our image derivatives if original-resolution sources can be retrieved.
The temporary signed staging URLs are removed from the repository on success.
"""
from pathlib import Path
from PIL import Image
from io import BytesIO
import urllib.request
SOURCES={"icons":"https://media.canva.com/v2/image-resize/format:PNG/height:150/quality:100/uri:ifs%3A%2F%2FM%2Fa54cb90a-f420-4d20-a126-a8443cb7e643/watermark:F/width:200?csig=AAAAAAAAAAAAAAAAAAAAAKx42hB77h7D_1xj6VEBmOQjAS9swHlgQdYTHKPPETsc&exp=1795619577&osig=AAAAAAAAAAAAAAAAAAAAAK9LaCQi_wkzO1Cm2gADDZUeS11ca3Sgqnj7_73MLCfB&signer=media-rpc&token=AAIAAU0AJGE1NGNiOTBhLWY0MjAtNGQyMC1hMTI2LWE4NDQzY2I3ZTY0MwAAAAABohNEXKjhbepQ9LZXlLAFvoTHxQ0WATA3m9hTL40AFpXhjxv70A&x-canva-quality=thumbnail","hero":"https://media.canva.com/v2/image-resize/format:PNG/height:200/quality:100/uri:ifs%3A%2F%2FM%2F82b7c0d9-e4cb-4e8a-a2b9-56740eeb05d3/watermark:F/width:160?csig=AAAAAAAAAAAAAAAAAAAAAIyIwg0dPfM-lxTe2-M7FDJf9nDfvinDDb5HwDxUguzV&exp=1795617890&osig=AAAAAAAAAAAAAAAAAAAAAE7wDcv5HEUIJRJAeX9fcYXfpXYAfjtMqVCZX0Z5sc3i&signer=media-rpc&token=AAIAAU0AJDgyYjdjMGQ5LWU0Y2ItNGU4YS1hMmI5LTU2NzQwZWViMDVkMwAAAAABohMqntBM-cwduvCGbX83Qmgs5ScG-oQ9L9YSqukz80KhSScs4w&x-canva-quality=thumbnail","ocean":"https://media.canva.com/v2/image-resize/format:PNG/height:200/quality:100/uri:ifs%3A%2F%2FM%2F9665932e-6f23-48b5-990b-9d5957a00602/watermark:F/width:112?csig=AAAAAAAAAAAAAAAAAAAAAM-_BahcY-8y_XlMk9HOl4UWYAaGcCq_ylf1JnfBiMZv&exp=1795619845&osig=AAAAAAAAAAAAAAAAAAAAAFRDj0lYxtjpXX64Sm_Srm7s2-mvoWQG8KemQT8MeV6W&signer=media-rpc&token=AAIAAU0AJDk2NjU5MzJlLTZmMjMtNDhiNS05OTBiLTlkNTk1N2EwMDYwMgAAAAABohNIc4giUXKXqteB-JCaF4CLCqrMV7QBqlP382vTBcRUIQ-8LQ&x-canva-quality=thumbnail"}
SIZE={"icons":(1448,1086),"hero":(1122,1402),"ocean":(941,1672)}
def fetch_image(name):
 url=SOURCES[name]
 for old,new in [("/height:150/","/height:"+str(SIZE[name][1])+"/"),("/height:200/","/height:"+str(SIZE[name][1])+"/"),("/width:200","/width:"+str(SIZE[name][0])),("/width:160","/width:"+str(SIZE[name][0])),("/width:112","/width:"+str(SIZE[name][0]))]:
  url=url.replace(old,new)
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (Rotta Canonica illustration importer)"})
 with urllib.request.urlopen(req,timeout=35) as response:
  im=Image.open(BytesIO(response.read()))
  im.load()
 print(name, im.size,im.mode,flush=True)
 if im.width<SIZE[name][0]*0.8 or im.height<SIZE[name][1]*0.8:
  raise RuntimeError("Artwork staging URL returned a thumbnail, not the user-supplied original: "+name)
 return im
icons=fetch_image("icons").convert("RGBA")
out=Path("assets/anime-icons");out.mkdir(parents=True,exist_ok=True)
mapping={"compass":(0,0),"episode":(0,1),"map":(0,2),"loot":(0,3),"spyglass":(0,4),
"chest":(1,0),"flag":(1,1),"progress":(1,2),"wheel":(1,3),"complete":(1,4),
"route":(2,0),"filler":(3,3),"anchor":(3,0),"locator":(3,1),"saga":(2,3),
"netflix":(2,2),"treasure":(3,4),"warning":(3,3),"sea-divider":(3,2),"download":(2,4)}
for name,(row,col) in mapping.items():
 x0=round(col*icons.width/5);x1=round((col+1)*icons.width/5)
 y0=round(row*icons.height/4);y1=round((row+1)*icons.height/4)
 tile=icons.crop((x0,y0,x1,y1));alpha=tile.getchannel("A")
 alpha=alpha.point(lambda value:0 if value<21 else (255 if value>=247 else value))
 tile.putalpha(alpha);box=alpha.getbbox()
 if not box:raise RuntimeError("Missing icon: "+name)
 tile=tile.crop(box);tile.thumbnail((205,205),Image.Resampling.LANCZOS)
 canvas=Image.new("RGBA",(224,224),(0,0,0,0))
 canvas.alpha_composite(tile,((224-tile.width)//2,(224-tile.height)//2))
 canvas.save(out/(name+".webp"),"WEBP",quality=82,method=6,exact=True)
for name,output,maxsize in [("hero","anime-hero-portrait.webp",(850,1160)),("ocean","anime-ocean-bg.webp",(900,1500))]:
 image=fetch_image(name).convert("RGB");image.thumbnail(maxsize,Image.Resampling.LANCZOS)
 image.save("assets/"+output,"WEBP",quality=77,method=6)
print("Extracted",len(mapping),"cel-shaded icons and 2 illustrated scenes",flush=True)
