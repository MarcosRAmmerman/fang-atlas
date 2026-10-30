from pathlib import Path
import re,json,sys
s=(Path(sys.argv[1]) if len(sys.argv)>1 else next(p for p in Path('CAD').rglob('*') if p.suffix.lower() in ['.stp','.step'])).read_bytes().decode('gbk',errors='replace')
entities={m[1]:m[2] for m in re.finditer(r'#(\d+)\s*=\s*((?:PRODUCT\b|PRODUCT_DEFINITION\b|PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE\b|NEXT_ASSEMBLY_USAGE_OCCURRENCE\b).*?);',s,re.S)}
mapping={}
for v in entities.values():
 if v.startswith('NEXT_ASSEMBLY_USAGE_OCCURRENCE'):
  name=re.search(r"'([^']+)'",v)[1];ref=re.findall(r'#(\d+)',v)[1]
  for _ in range(3):
   entity=entities[ref]
   if entity.startswith('PRODUCT ('):break
   ref=re.findall(r'#(\d+)',entity)[0]
  mapping[name]=re.search(r"'([^']+)'",entity)[1]
Path(sys.argv[2] if len(sys.argv)>2 else '.local/name-map.json').write_text(json.dumps(mapping,ensure_ascii=False),encoding='utf8')
