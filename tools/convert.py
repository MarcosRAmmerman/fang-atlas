"""Native OpenCascade conversion, completely local. Input is always read-only."""
from pathlib import Path
import sys, re, hashlib, json, time
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TDocStd import TDocStd_Document
from OCP.TCollection import TCollection_ExtendedString, TCollection_AsciiString
from OCP.collections import Sequence_TDF_Label as TDF_LabelSequence
from OCP.XCAFDoc import XCAFDoc_DocumentTool
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.RWGltf import RWGltf_CafWriter
from OCP.RWMesh import RWMesh_CoordinateSystemConverter, RWMesh_CoordinateSystem
from OCP.collections import IndexedDataMap_TCollection_AsciiString_TCollection_AsciiString as TColStd_IndexedDataMapOfStringString
from OCP.Message import Message_ProgressRange
from OCP.IFSelect import IFSelect_RetDone
from OCP.Interface import Interface_Static

source=Path(sys.argv[1]) if len(sys.argv)>1 else next(p for p in Path('CAD').rglob('*') if p.suffix.lower() in ['.step','.stp'])
output=Path(sys.argv[2]) if len(sys.argv)>2 else Path('public/models/hero')
output.mkdir(parents=True,exist_ok=True)
if (output/'model.glb').exists():
    raise RuntimeError('Output already contains a model. Use a new staging directory or the revision-safe convert:hopper command.')
raw=source.read_bytes(); sha=hashlib.sha256(raw).hexdigest()
# This source uses legacy GBK inside STEP strings. Encode those strings using
# ISO-10303 Unicode escapes in a temporary derived file; geometry is unchanged.
def repair(m):
    value=m.group(0)
    if any(c>127 for c in value):
        s=value[1:-1].decode('gbk',errors='replace')
        return ("'\\X2\\"+s.encode('utf-16-be').hex().upper()+"\\X0\\'").encode('ascii')
    return value
temp=Path('.local/normalized-'+sha[:12]+'.step');temp.parent.mkdir(exist_ok=True)
temp.write_bytes(re.sub(rb"'(?:[^']|'')*'",repair,raw))
print('Reading native STEP:',source.name,flush=True)
doc=TDocStd_Document(TCollection_ExtendedString('FANG Atlas'))
reader=STEPCAFControl_Reader();reader.SetNameMode(True);reader.SetColorMode(True)
Interface_Static.SetCVal_s('xstep.cascade.unit','MM')
if reader.ReadFile(str(temp.resolve()))!=IFSelect_RetDone: raise RuntimeError('STEP read failed')
print('Transferring assembly',flush=True)
if not reader.Transfer(doc): raise RuntimeError('STEP transfer failed')
shape_tool=XCAFDoc_DocumentTool.ShapeTool_s(doc.Main()); roots=TDF_LabelSequence();shape_tool.GetFreeShapes(roots)
for i in range(1,roots.Length()+1):
    shape=shape_tool.GetShape_s(roots.Value(i));print('Meshing root',i,flush=True)
    mesh=BRepMesh_IncrementalMesh(shape,1.0,False,0.5,True)
    if not mesh.IsDone(): raise RuntimeError('Tessellation failed')
writer=RWGltf_CafWriter(TCollection_AsciiString(str((output/'model.glb').resolve())),True)
converter=RWMesh_CoordinateSystemConverter();converter.SetInputLengthUnit(0.001);converter.SetOutputLengthUnit(1.0)
# Retain source axes here; model manifest determines the verified display up axis.
converter.SetInputCoordinateSystem(RWMesh_CoordinateSystem.RWMesh_CoordinateSystem_Yup)
converter.SetOutputCoordinateSystem(RWMesh_CoordinateSystem.RWMesh_CoordinateSystem_Yup)
writer.SetCoordinateSystemConverter(converter);writer.SetMergeFaces(True)
print('Writing GLB',flush=True)
if not writer.Perform(doc,TColStd_IndexedDataMapOfStringString(),Message_ProgressRange()):raise RuntimeError('GLB export failed')
(output/'source-report.json').write_text(json.dumps({'source':source.name,'sourceBytes':len(raw),'sourceSha256':sha,'pipeline':'cadquery-ocp 8.0.1.1.0 / OpenCascade native','sourceUnits':'STEP length contexts normalized to millimeters on import','outputUnits':'meter','linearDeflectionMM':1.0,'angularDeflectionRadians':0.5,'productRecords':len(re.findall(rb'PRODUCT\s*\(',raw)),'assemblyRelationships':raw.count(b'NEXT_ASSEMBLY_USAGE_OCCURRENCE'),'solidDefinitions':raw.count(b'MANIFOLD_SOLID_BREP')},indent=2),encoding='utf8')
assert hashlib.sha256(source.read_bytes()).hexdigest()==sha,'Source changed unexpectedly'
print('Exported',output/'model.glb',(output/'model.glb').stat().st_size,'bytes',flush=True)
