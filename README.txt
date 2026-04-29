GLITCHED MATRIX Prototype Lab GitHub Site Refresh
=================================================

Use this folder as the replacement GitHub Pages site bundle.

What changed:
- Homepage wording now reflects the latest HoloVerse, MatrixCore, Gleebs, Urban Warzone, Metropolis Robot Selector, and Prototype Lab inventory.
- Patch notes were refreshed at assets/data/combined_patch_notes.txt while preserving the older exported history below the new notes.
- New optimized images were added from the current Prototype Lab build, including at least one Gleebs image.
- The existing layout, navigation, trailer, admin panel, lightbox, Steam link, and page structure were preserved.

Easiest image replacement:
1. Open assets/images/site_current/.
2. Replace an image with a new image using the same filename.
3. Open assets/data/image_manifest.json and change assetVersion to a new value.
4. Upload/commit the site files.

Advanced image replacement:
- Edit assets/data/image_manifest.json and change the image paths.
- You can also open the live editor with ?admin=1 or Ctrl+Shift+A while viewing the page.

Main files:
- index.html
- style.css
- admin.js
- assets/data/combined_patch_notes.txt
- assets/data/image_manifest.json
- assets/images/site_current/


Playable demo gallery
=====================

This refresh adds a Play Demos section to the static GitHub Pages site. The current playable demos are generated browser/canvas slices for Sky and Ground, Block Busters, Duck n Cover, Where's Renaldo, Mewtants, DreamCrawler2D, Helix Biogenics, Isometric World Machine, and Holo Campaign. They do not load sprite, sound, Python runtime, or EXE assets.

To update the demo grid without changing the layout:

1. Edit assets/data/demo_manifest.json.
2. Replace thumbnails in assets/images/site_current/demo_thumbs using the same filenames, or change the thumbnail paths in the manifest.
3. Bump assetVersion in demo_manifest.json so browsers refresh cached thumbnails.

HoloVerse is intentionally not embedded yet. The current demos are lightweight, asset-free teasers for existing simple prototypes only.

Pass 3 GitHub Pages fix notes
-----------------------------
If the Play Demos canvas was showing as a plain black box, replace the site with this pass and wait for GitHub Pages to finish deploying. This build cache-busts the demo JavaScript/CSS, resets the old browser-local image config key, and includes an inline fallback player so the demo panel stays visible even if an external script path is stale during deployment.

The easiest image replacement path is still:
assets/images/site_current/
assets/images/site_current/demo_thumbs/

After replacing images, update assets/data/image_manifest.json or keep the same filenames, then bump the assetVersion value.
