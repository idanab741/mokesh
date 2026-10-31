# בונה את mokesh-vercel/i18n/en.js מהמילון (en.json) ומקוד התרגום (i18n-runtime.js)
import json,os
here=os.path.dirname(os.path.abspath(__file__));web=os.path.join(here,'..','mokesh-vercel','i18n')
d=json.load(open(os.path.join(web,'en.json')))
rt=open(os.path.join(here,'i18n-runtime.js')).read()
open(os.path.join(web,'en.js'),'w').write('window.I18N_EN_DICT='+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n'+rt)
print('en.js',len(d),'strings')
