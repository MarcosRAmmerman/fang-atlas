# FANG Atlas

A local, static Three.js exhibit featuring **Hopper — FANG Robotics** by default, with **Hero — Reference Design** available in the robot selector. Both are converted from the supplied real STEP assemblies. No backend, accounts, keys, remote fonts, runtime network dependencies, or deployment.

## Hopper upgrade

The original viewer, UI, component tree, annotation system, explosion controller, and lesson player are reused. The selector switches GLB, attribution, annotations, lesson, and camera configuration **without a page reload**. Previous geometry is disposed after a successful switch; failed loads retain the current robot. Out-of-order requests cannot replace a newer selection.

Hopper's source `CAD/Hopper.step` is 137,395,993 bytes, exported through Autodesk Translation Framework on 2026-09-29. It contains 407 PRODUCT records, 2,112 assembly relationships, and 1,105 solid definitions, with millimeter and meter length contexts. Native OpenCascade normalizes imported geometry to millimeters, then exports meters. The verified display-up axis is Y. Approximate assembled extents are **0.510 × 0.577 × 0.571 m**.

The optimized Hopper GLB is about **21.2 MB**, with **3,136 CAD hierarchy nodes**, **3,590 rendered meshes**, and **2,580,142 triangles** including repeated instances. Welding, simplification, and deduplication retain part selection and assembly transforms. Some source electronics contain many small parts; older phones may render more slowly. The exporter reported two nodes without geometry (`Component18` and `RM2019 Referee System Armor Module AM12`); there is no geometry to display for those entries. The original STEP remains intact.

Hopper has six new annotations: chassis, corner drive module, omni wheel, wheel motor, onboard computing assembly, and upper assembly support. Names and evidence come from Hopper, not Hero. The five-step **Two ways to roll** lesson inspects the real omni wheel and motor, then ends with a quiz. `SHOCK` is retained as a CAD label, but suspension travel/damping and actual wiring are unverified. English and Chinese source names are retained; legacy GBK wheel-name escapes are decoded for readability while the original imported strings are preserved in GLB extras.

Hopper's exploded view moves the four corner modules horizontally, lifts the upper equipment with common offsets, and separates the shell and support. Ten source groups move; fasteners remain with their groups. This is an inspection view, not simulated mechanism motion. Interpolation snaps precisely to original local transforms when reassembled. Hero keeps its own twelve-group configuration and original educational content.

### Update Hopper safely

No conversion is needed to run the included website. For a new revision, **save a new STEP filename** rather than overwriting the old source, then run:

```powershell
npm.cmd run convert:hopper -- 'CAD\Hopper-v2.step'
```

To regenerate the current `CAD/Hopper.step`:

```powershell
npm.cmd run convert:hopper
```

The command uses the existing project-local Python/OpenCascade installation and:

1. Preserves an input snapshot at `.local/model-revisions/hopper/<SHA256>.step`.
2. Builds and optimizes in a unique `.local/hopper-builds/` staging directory.
3. Resolves educational targets by **exact source names within their assemblies**, rather than assuming IDs from the previous revision.
4. Validates real geometry, annotation anchors, lesson targets, disjoint explosion groups, and exact animated reassembly.
5. Archives the previous complete active folder, including your editable JSON, under `.local/model-revisions/hopper/<timestamp>-previous-assets/` before activating the new assets.

If conversion, target matching, or validation fails, active Hopper remains unchanged. Staged results remain available for review. The initial supplied Hopper source has already been snapshotted. The native low-level converter refuses to overwrite an existing GLB; use the safe command above.

After every CAD revision, review the real browser view, source identities, annotation locations, camera orientation, and explosion. An unchanged name is useful evidence, not proof that a mechanism still has the same role. If assembly names change, update `tools/curate-hopper.mjs` deliberately. Direct edits to active `annotations.json` and `lesson.json` work immediately, but regeneration produces the curated defaults; previous edits remain in the archive. Put persistent editorial changes into the curator too.

To restore an old model, copy its archived assets into a new folder under `public/models/` and point the Hopper entry in `public/models/catalog.json` to that manifest. Adjust the archived manifest's asset/annotation/lesson URLs to the new folder. Keep archives and original CAD out of `public/` until intentionally making an asset revision active. No revisions are deleted automatically.

### Model configuration

- `public/models/catalog.json`: default and dropdown entries.
- `public/models/hopper/manifest.json`: Hopper assets, metadata, orientation, camera, translated names, and explosion directions.
- `public/models/hopper/annotations.json` and `lesson.json`: editable Hopper-only educational content.
- `public/models/hero/`: original Hero files, unchanged by the Hopper upgrade.
- `tools/convert-hopper.mjs`: revision-safe native conversion workflow.
- `tools/curate-hopper.mjs`: name-scoped targets and Hopper educational defaults.

Use `/?model=hopper` or `/?model=hero` for direct entry. Custom manifest URLs remain supported. Explosion direction vectors are in display-world axes; anchors remain in component-local meters. The first prototype's Hero conversion notes follow below.

## Run on Windows

Node.js 22.12+ is required (verified here with Node 24.19). The converted model is already included; **you do not need to convert it again to run the site**.

```powershell
cd 'C:\Users\Marcos\Documents\codex projects\bot breakdown'
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173/**. Stop with Ctrl+C. If Vite selects another port, use the URL it prints.

```powershell
npm.cmd test
npm.cmd run test:browser
npm.cmd run build
npm.cmd run preview
```

The browser tests use the installed Windows Chrome at the path in `playwright.config.js`. Update `executablePath` for another installation. The preview command serves the production build, normally at http://127.0.0.1:4173/. Only `dist/` is suitable for eventual static hosting. Nothing has been published.

## Explore

- Left drag: orbit. Wheel: zoom. Right drag: pan. Touch: one finger orbit, two fingers pan/zoom.
- Numbered markers: focus a named subsystem and open an educational panel. Previous/Next traverse all six.
- Assembly tree: expand disclosure arrows; click a name to select. Search original Chinese names, known English display names, or component IDs.
- Isolate, Hide, Restore all: inspect actual components. Reset restores geometry, camera, and assembled state.
- Explode: separates **12 intact groups**, including the four wheel modules. This is a visual inspection tool, not a kinematic or disassembly simulation. Use Fit if you change the orbit or zoom substantially.
- Guided tour: five steps, approximately 90 seconds, including motor/coupling/wheel inspection, a separation exercise, and a quiz with feedback.
- Keyboard: Tab to controls or the viewport; viewport arrows orbit/zoom, Shift+arrows pan. Escape closes panels. Native range controls work with arrows. Reduced-motion preferences disable camera interpolation and explosion interpolation.

## Hero reference: what was found and converted

The local file is a **253,397,373-byte STEP AP214**, exported by SolidWorks 2020 on 2023-09-15. It has millimeter units, 117 PRODUCT records, 215 NEXT_ASSEMBLY_USAGE_OCCURRENCE relationships, and 775 MANIFOLD_SOLID_BREP definitions. These counts describe source entities, not a one-to-one count of displayed parts.

The successful pipeline preserves a **225-node CAD hierarchy**, transforms, source names, and per-face color groupings. It produces **397 rendered meshes**, **1,155,146 triangles**, and a **23.6 MB GLB** (decimal). Approximate assembly extents are 0.723 × 0.701 × 0.637 meters, in the source X/Y/Z axes. Source Y is the verified display-up direction for this assembly. The viewer grounds and centers the scene without changing relative part placement.

The initial `occt-import-js` WebAssembly route recovered hierarchy but returned empty triangles for this file. It is retained as `tools/convert.cjs` for investigation and rejects empty exports; **it is not the supported Hero conversion command**. Native OpenCascade succeeded. No FreeCAD installation was required.

`public/models/hero/source-report.json` records conversion parameters and the original SHA-256. Tests verify that the source still matches it. Original CAD is never overwritten, uploaded, or included in `dist`. Vite denies direct access to `CAD/` and `.local/`.

## Reproduce the Hero conversion

This workspace already has a private portable Python in `.local/python/` with the pinned OpenCascade package. Run:

```powershell
npm.cmd run convert
```

This command explicitly selects the original Hero source even though Hopper is now in `CAD/`. It stages the conversion and archives previous Hero assets before activating them. It is **not needed for Hopper** and was not run during this upgrade. It can take several minutes and uses substantial RAM. It runs:

1. `tools/convert.py`: native OpenCascade STEP/XCAF import and 1 mm / 0.5 rad tessellation; glTF export in meters with explicit unit and axis handling.
2. `tools/names.py`: resolves STEP occurrence → product definition → formation → product names.
3. `tools/inspect-glb.mjs`: stable component IDs, source names, mesh statistics, and bounds.
4. `tools/optimize.mjs`: weld, error-bounded mesh simplification, shared-data deduplication, and pruning of redundant data; no removal of selected fastener components or hierarchy flattening.
5. A second inspection and `tools/curate-hero.mjs`, which regenerates Hero annotations, local-space anchors, lesson JSON, and manifest.

The Hero source has GBK-encoded Chinese strings. A derived `.local/normalized-<hash>.step` replaces only non-ASCII STEP strings with ISO-10303 Unicode escapes. Geometry and the original source file stay unchanged. Hopper is ASCII with STEP string escapes; its existing escapes pass through unchanged. Occurrence-name mappings are scoped to an explicit model file, never borrowed from another robot.

On a fresh Windows computer, install 64-bit Python 3.12 from [python.org](https://www.python.org/downloads/windows/) with the launcher enabled, then:

```powershell
py -3.12 -m venv .local/python
.\.local\python\Scripts\python.exe -m pip install -r tools/requirements.txt
```

The pipeline detects portable Python, a standard `.local/python` virtual environment, or falls back to `python` on PATH. Dependencies are pinned by `tools/requirements.txt` and `package-lock.json`.

References: [OpenCascade glTF writer](https://occt3d.com/dev/doc/refman/html/class_r_w_gltf___caf_writer.html), [coordinate/unit conversion](https://dev.opencascade.org/doc/occt-7.8.0/refman/html/classRWMesh__CoordinateSystemConverter.html).

## Add another robot

Keep its STEP outside `public/`. Use the generic conversion tools with a separate output directory:

```powershell
.\.local\python\python.exe tools/convert.py 'CAD\other.step' 'public/models/other'
.\.local\python\python.exe tools/names.py 'CAD\other.step' '.local/other-name-map.json'
node tools/inspect-glb.mjs public/models/other .local/other-name-map.json
node tools/optimize.mjs public/models/other
node tools/inspect-glb.mjs public/models/other .local/other-name-map.json
```

For a standard virtual environment, use `.local\python\Scripts\python.exe` instead. The legacy `names.py` helper targets SolidWorks-style PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE records. For files with good native OpenCascade names, such as Hopper, skip it and omit its mapping argument. Inspect `conversion.json` and the real rendered geometry before naming subsystems. Write separate `manifest.json`, `annotations.json`, and `lesson.json`; the existing files are examples. Do not run a robot-specific curator for a different robot.

Open `/?model=./models/other/manifest.json`. Asset and content URLs in the manifest are relative to the page root. Set `rotation` (Euler XYZ radians) after confirming the source up axis. Set `explodeGroups` to **non-overlapping** assembly component IDs. Annotation `anchor` values are component-local positions in meters. IDs remain stable for this source and pipeline but must be reviewed after changing CAD or converter versions.

Manifest fields: `schemaVersion`, `id`, `title`, `asset`, `units`, `rotation`, `annotations`, `lesson`, `explodeGroups`, `displayNames`, `stats`, and `attribution`. Optional `organization`, `sourceDescription`, `camera`, and `explode` fields customize display and separation. Add the model to the catalog to make it selectable. The viewer, annotations, and explosion controller use these data rather than Hero geometry assumptions.

## Files

| Location | Purpose |
| --- | --- |
| `CAD/` | Unchanged local STEP source; ignored by Git and never bundled |
| `tools/` | Reusable conversion, inspection, optimization; separate Hero curation |
| `public/models/hero/` | GLB, model manifest, editable annotations and lesson, conversion reports |
| `src/viewer.js` | Loading, materials, navigation, selection, isolation, camera |
| `src/annotations.js` | Projected markers and collision-aware leader lines |
| `src/explode.js` | Reversible group separation from original transforms |
| `src/main.js`, `src/style.css` | Exhibit UI, hierarchy browser, lesson controls |
| `tests/` | Geometry/provenance invariants and Chrome interaction tests |

## Verification and limits

The Hopper upgrade passes **5 asset/provenance tests and 8 browser tests**, covering Hopper as default, real component picking, mouse orbit and keyboard pan, search, isolation/restoration, both lessons and quizzes, repeated model switching without reload, recovery from a failed GLB load, stale-request handling, desktop/mobile layouts, and exact reassembly. Both original STEP hashes and every original Hero asset are checked against the pre-upgrade baseline. `convert:hopper` was exercised end to end, including staging, validation, previous-asset archival, and activation. Production builds contain only web assets; CAD and revision archives remain outside them.

Milestones A–E are implemented: native conversion, real 3D navigation, component selection, six anchored annotations, and a complete guided lesson/quiz. Milestone F includes a successful production build, asset tests, desktop/mobile browser tests, and visual inspection of generated Chrome screenshots. The separate interactive browser-control connection was unavailable; Chrome ran through Playwright for verification.

Materials are illustrative studio rendering based on CAD colors. No exact material, motor rating, wiring, pneumatic setting, control algorithm, or physical joint travel is claimed. Annotations identify their evidence and uncertainties. Mesh simplification and 1 mm tessellation make this an educational viewer, not a metrology/CAM tool. Full model load is still approximately 23.6 MB, and older phones may render slowly. Markers remain visible through intervening geometry to keep internal components discoverable; they are not depth-occluded. Real-time cast shadows are omitted for rendering performance. The explosion animation is schematic and can move wheel groups below the nominal floor plane.

Attribution to **South China Agricultural University** and the archive provenance were supplied by the project owner, not independently authenticated. CAD redistribution rights are not established. Deployment and redistribution decisions remain with the owner.


## Auto X-Ray

Auto X-Ray starts ON for both robots. Select a component through a marker, the assembly tree, the model, or a lesson. Geometry between the camera and the selected surfaces fades to 20% opacity; the slider adjusts this from 15?25%. Turn it OFF for the original opaque viewing behavior. Clear selection with Escape, a blank-space click, or Reset. Isolate, Restore all, and Explode retain their existing meanings; Restore all restores visibility and then X-Ray reevaluates the current selection. Preferences survive robot switching during the session.

`src/occlusion.js` tests a projected 5?5 grid plus up to nine component-center samples against actual selected surfaces. World bounding boxes prune raycast candidates, and only intersections before a selected surface become blockers. Selected descendants are excluded. Visibility checks run immediately on selection/visibility changes, at most four times per second during meaningful camera or explosion motion, and once after settling. Stationary views reuse the cached result. A 220 ms release grace reduces edge flicker; transitions take 320 ms (immediate for reduced-motion users). This sampled approach can miss exceptionally thin obstructions between sample rays.

Temporary per-mesh material clones preserve shared originals, material arrays, opacity, depth writing, colors, and render order. Faded shells retain depth testing but stop writing depth. Selected geometry renders opaque after those shells while still depth-testing against ordinary opaque parts. Picking passes through faded blockers. Clearing/disabling restores the original material references after the fade; temporary clones are reused for subsequent selections and disposed when switching models. Single-pass rendering avoids doubling the draw calls of double-sided CAD surfaces.

Run `npm test`, then start `npm run dev` and run `npm run test:browser -- --workers=1`. Occlusion unit tests cover depth ordering, unrelated geometry, nested selections, smooth fades, shared materials, transparent material arrays, exact restoration, isolation and throttling. Chrome tests exercise actual Hopper/Hero motors, picking through faded shells, camera reversal, opacity adjustment, toggle/clear restoration, and mobile controls. Screenshots are saved under `.local/`. No CAD conversion or GLB changes are needed for this feature.


The performance optimization, measured Jetson results, BVH initialization/memory costs, and reproducible profiling commands are documented in [docs/xray-performance.md](docs/xray-performance.md). On slower devices, two visibility checks above 12 ms switch the current selection to updates on camera pause. The control displays **Auto X-Ray: ON (on pause)**; transparency and camera controls remain active.
