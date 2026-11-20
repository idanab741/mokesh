import base64, io, json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
R='/home/user/mokesh/parenting-app/tools/baby-turn/reference/'
spec={'happy':('boy-stand.png',506,322,138),'laugh':('boy-stand-laugh.png',501,318,150),'sad':('boy-stand-sad.png',495,320,146)}
out={}
for k,(f,cx,cy,h) in spec.items():
    im=Image.open(R+f).convert('RGB').crop((cx-h,cy-h,cx+h,cy+h)).resize((360,360),Image.LANCZOS)
    m=Image.new('L',(360,360),0); d=ImageDraw.Draw(m)
    rx,ry=0.80*180,0.82*180
    d.ellipse((180-rx,186-ry,180+rx,186+ry),fill=255)
    m=m.filter(ImageFilter.GaussianBlur(16))
    im.putalpha(m)
    b=io.BytesIO(); im.save(b,'PNG'); out[k]='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
    if k=='happy':
        a=np.asarray(im)[60:95,150:210,:3].reshape(-1,3); print('forehead',np.median(a,axis=0))
        a=np.asarray(im)[300:330,150:210,:3].reshape(-1,3); print('chin',np.median(a,axis=0))
    im.save(k+'.png')
json.dump(out,open('faces.json','w')); print({k:len(v) for k,v in out.items()})
