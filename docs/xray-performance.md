# Smart X-Ray performance investigation

## Reproduction and cause

Measured in installed desktop Chrome, headless, 1440×1000, normal motion, local Vite server. The fixture selects **Onboard computing assembly**, the real `node-369` Jetson CAD assembly. Hopper contains 3,590 meshes / 2,580,142 triangles; the 397-mesh figure describes Hero. The selected Jetson subtree alone contains 2,406 meshes.

The largest cost was rendering, not just raycasting. The old code promoted every selected descendant into the transparent queue to draw its opaque highlight after faded shells. Double-sided transparent materials trigger front/back rendering passes. This nearly doubled draw calls in the Jetson view even though only **five meshes** were blockers. Renderer CPU submission time rose to about 46 ms. An independent same-view experiment toggling only `forceSinglePass` reproduced the difference: **45.3 → 6.8 ms median renderer CPU time; 5,585 → 3,174 draw calls**. This also removes redundant surface rendering; GPU time itself was not separately measured, so these numbers are not GPU timings.

The old visibility algorithm cost about 30 ms per check. It was throttled, not run every frame, but its finely rounded camera signature repeatedly invalidated the cache during focus/damping. In the three-second Jetson measurement it ran 23 times. The new scheduler ran one final settling check in the corresponding window. Material cloning was not occurring on every frame, but repeated selections allocated/disposed thousands of clones. Caching clones avoids that churn. There is no React; no repeated UI framework rendering was involved.

## Changes

- Keep the current 25 projected samples plus up to nine center samples, actual surface intersections, per-mesh blockers, and selected-descendant exclusion. No reduction in sampling quality or arbitrary blocker cap.
- Build `three-mesh-bvh` trees once per unique loaded geometry with at least 100 triangles. Use indirect indices to preserve geometry/index ordering; never change on-disk GLBs. Share trees between instances, use first-hit-per-mesh intersections, and release trees on disposal. Model loading yields between build batches and checks cancellation before activation.
- Cache world bounding boxes until transforms change; reuse candidate/hit arrays, raycaster and sample vectors. Cache selected membership instead of traversing ancestors every animation frame. Skip hover picking while dragging; selection picking remains accelerated.
- Check immediately for selection, toggle-on and visibility changes. During motion, check at most every 250 ms after 0.3% model-diagonal translation, 0.012 radians rotation, a projection change, or meaningful explosion motion. Perform a final check after 180 ms of settling, respecting the throttle. Small accumulated motion is measured against the last checked pose. Opacity changes do not raycast.
- Keep 320 ms fades separate from detection. Reuse material clones for the model lifetime, restore original references when inactive, and dispose cached clones when replacing the model. Use single-pass transparent shells and single-pass opaque selected surfaces; retain depth testing and selected render order.
- After two consecutive checks over 12 ms, keep the prior result during motion and recalculate on pause. Show **ON (on pause)** and announce the behavior. Selection changes reset this adaptive mode; X-Ray is never silently disabled.

The acceleration API follows the [three-mesh-bvh documentation](https://github.com/gkjohnson/three-mesh-bvh#use). Version 0.9.16 is pinned.

## Recorded results

Each scenario samples animation-frame intervals and wrapped CPU calls for three seconds after a 1.8-second warmup. Times below are milliseconds, **median / p95**. Raw frame, CPU, heap, mesh and draw-call measurements are in [benchmarks](benchmarks/).

| Scenario | Frame interval before | Frame interval after | Occlusion CPU before | Occlusion CPU after |
|---|---:|---:|---:|---:|
| Hopper, no selection | 16.7 / 16.8 | 16.7 / 16.8 | no checks | no checks |
| Jetson, X-Ray ON | 50.2 / 83.5 | 16.7 / 16.8 | 30.5 / 32.7 | 4.2 / 4.2 (one final check) |
| Jetson, X-Ray OFF | 16.7 / 16.8 | 16.7 / 16.8 | no checks | no checks |
| Jetson, continuous orbit | 50.1 / 83.5 | 16.7 / 16.8 | 29.1 / 39.9 | 4.1 / 4.8 |
| Hopper, alternating selections | 16.7 / 50.1 | 16.7 / 16.9 | 6.7 / 30.4 | 2.7 / 4.0 |
| Hero motor, continuous orbit | 16.7 / 16.8 | 16.7 / 16.8 | 25.7 / 38.2 | 0.5 / 0.7 |

The orbit harness advances by a fixed angle per frame, so faster runs traverse more angles in the same three seconds. These orbit rows show interaction behavior, not perfectly matched camera trajectories. The stationary Jetson view and independent ablation use matched geometry and camera poses. In the ablation, native vs BVH occlusion returned identical mesh sets across 15 repetitions: **31.5 → 3.6 ms median**, **37.0 → 4.2 ms p95**. Continuous optimized orbit performs 12 checks in three seconds. Stationary views cease checking after the final settle/release checks.

### Initialization and memory

| Model | Accelerated unique geometries | Build CPU | Build elapsed including yields | Tree + indirect-index buffers |
|---|---:|---:|---:|---:|
| Hopper | 285 | 144 ms | 169 ms | 7,474,656 bytes (7.13 MiB) |
| Hero | 199 | 152 ms | 268 ms | 8,988,556 bytes (8.57 MiB) |

The original implementation had no BVH build cost. These buffer counts are actual allocated tree/index buffers, excluding JS object overhead and the pre-existing geometry. Raw `performance.memory` snapshots are retained, but are not reliable retained-heap comparisons because garbage collection was not forced and Chrome does not promptly release all model resources. Clone caching intentionally retains temporary materials until model replacement. Tests verify tree references and cached materials are cleared when switching. The added library increases the production JS bundle from approximately 666 kB to 736 kB before gzip (about 21.5 kB additional gzip).

## Reproduce and verify

With `npm run dev` running:

```powershell
node tools/benchmark-xray.mjs current
node tools/benchmark-xray-ablation.mjs
npm test
npm run test:browser -- --workers=1
npm run build
```

The scripts use installed Chrome, write `.local/perf-*.json`, and capture screenshots. The ablation temporarily switches native/BVH raycasting and double/single-pass rendering **in its own browser page only**, checks identical blocker sets, and restores the optimized state. Historical baseline JSON is preserved in this directory; running the current application does not regenerate the historical implementation.

Unit coverage includes cached stationary views, motion throttle/final check, fallback, shared material reuse/disposal, BVH index/hit parity, nested selections, and exact restoration. Browser coverage includes Jetson's render-pass count, stationary checks, rotation throttle, fallback indication/recovery, model disposal, both robots' picking/opacity/restoration, existing lessons, isolation, explosion, switching and mobile layouts. Desktop/mobile screenshots were inspected.

These are local measurements, not a universal FPS guarantee. Thousands of CAD draw calls still impose a baseline cost on slower devices. BVH construction remains synchronous within each geometry, although loading yields between batches. Sampling can miss exceptionally thin blockers between rays. Single-pass transparency preserves the reveal but can differ slightly in overlapping front/back surface blending. No STEP, GLB, annotation, lesson, or conversion pipeline files were modified, and nothing was deployed.
