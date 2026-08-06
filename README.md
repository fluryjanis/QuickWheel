# 🧪 Research Wheel

## What It Is

Transform your research speed with **Research Wheel** an 8-action, single-ring radial gesture menu and workspace sidebar extension works on Google and is tailored natively for Mozilla Firefox under the WebExtensions Manifest V3 architecture. Created to eliminate browsing friction, it assists researchers, students, and writers with rapid content clipping, citation generation, translation, and academic searches directly from any webpage.

---
## Download Now
* **Download:** *(https://github.com/fluryjanis/ResearchWheel/releases/tag/v2.0.0)*
---

## Key Features & Gestures

### Features

* **8-Octant Radial Wheel:** Drag-to-select radial menu triggered via middle-click. It provides immediate access to search actions, note clipping, and citation generation.
* **Unified Workspace Sidebar:** A native Firefox sidebar that displays your saved notes, clipped quotes, and generated citations.
* **Advanced Citation Engine:** Generates citations on-the-fly for APA 7th, MLA 9th, Chicago 17th, and BibTeX.
* **Proper Noun Engine:** Applies sentence-casing rules to article titles while preserving proper nouns (e.g., U.S. states, political entities, names) and dynamically stripping possessives with straight, curly, or backtick apostrophes.
* **Tagline and Brand Stripper:** Strips generic site tags (such as `: NPR` or `- NBC News`) from scraped webpage headers.
* **Dual-Mode Homepage Detector:** Identifies root or localized homepages to cleanly override taglines with organizational group publishers.

### Radial Wheel Gesture Mappings

* **🎓 Scholar Search (NORTH):** Launches a Google Scholar search using your highlighted text (or webpage title if no text is selected).
* **🧬 PubMed (NORTH-EAST):** Launches a PubMed search using your highlight or title.
* **📝 Append Note (EAST):** Clips selected text directly to your Workspace sidebar as a general research note.
* **📜 Citation (SOUTH-EAST):** Formats, saves, and copies a citation of the page using your active style preference (APA, MLA, Chicago, or BibTeX).
* **📂 Workspace (SOUTH):** Commands the background script to open the sidebar. If Gecko blocking policies restrict programmatic opening, a page-level toast prompts you to use the shortcut.
* **🌐 Translate (SOUTH-WEST):** Translates the leading text containers on the webpage in-place using translation engines.
* **🔗 Title + URL (WEST):** Copies a clean markdown hyperlink `[Page Title](URL)` directly to your clipboard.
* **📋 Quote + Source (NORTH-WEST):** Copies and saves highlighted text as a blockquote along with its markdown-formatted source attribution.

---

## Why Research Wheel?

* **Preserves Native Autoscroll:** Quick middle-clicks are handled smoothly without interfering with native browser scrolling behaviors.
* **Autoscroll & Deselection Mitigation:** Synchronously captures text highlights on `mousedown` before Firefox can natively clear selection buffers or trigger autoscroll behavior.
* **Scroll & Key Blocking:** Temporarily suspends scroll events, touch moves, and keyboard navigation keys (`Space`, `Arrows`, `PageUp`/`PageDown`) when the radial wheel is active to prevent shifts in webpage positioning.
* **100% Private:** Operates entirely locally on your device with zero data collection, analytics, or external tracking.

---
##  Screenshot

*<img width="443" height="429" alt="image-removebg-preview (1)" src="https://github.com/user-attachments/assets/57c0bf91-60af-48ac-b4eb-6088dc5bbfb2" />*

---

##  Download Link

* **Download on itch.io:** *(https://frog1230.itch.io/quickwheel)*

### Chrome / Unpacked Installation:
1. Download the extension ZIP file and extract it to a folder.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle **Developer mode** to **ON** in the top right corner.
4. Click **Load unpacked** in the top left and select your extracted folder.

---

## GitHub & Portfolio

* **Source Code:** [fluryjanis/ResearchWheel](https://github.com/fluryjanis/ResearchWheel)
* **Developer Portfolio:** [Frog1230 Portfolio](https://fluryjanis.github.io/frog1230.github.io/)
* **Other Projects:** [MindShield](https://frog1230.itch.io/mind-shield) | [Content Chef](https://frog1230.itch.io/content-chef) | [Remind Me](https://frog1230.itch.io/remind-me)

---

## 📜 Changelog

### Version 2.0.0 (The Research Edition Pivot)
* **Rebranded to Research Wheel:** Pivoted project from QuickWheel to Research Wheel, focusing entirely on academic research, citation generation, and note clipping.
* **8-Octant Radial Wheel:** Replaced generic tab navigation gestures with 8 dedicated research actions (Google Scholar, PubMed, Append Note, Citation Generator, Workspace Panel, Translate, Title + URL, Quote + Source).
* **Native Workspace Side Panel:** Introduced a persistent sidebar UI to capture, review, organize, and manage saved quotes, notes, and citations.
* **Advanced Citation Engine:** Added on-the-fly citation generation supporting **APA 7th**, **MLA 9th**, **Chicago 17th**, and **BibTeX** formats.
* **Proper Noun Engine:** Built-in heuristics for intelligent title sentence-casing while preserving proper nouns, acronyms, and locations.
* **Metadata & Scraper Guards:** Integrated automated cleaning to strip site taglines, filter out invalid author strings, and clean source metadata before serialization.
* **Markdown Export:** Added one-click export of all collected research workspace notes to local `.md` files.
* **Interaction Hardening:** Implemented synchronous `mousedown` selection capture and temporary input/scroll locks while the radial wheel is active to prevent page shifts and text deselection.

---

### Version 1.0.0 (Initial Release - QuickWheel)
* Dual-ring radial gesture wheel triggered via middle mouse hold (>150ms).
* Integrated 8 directional shortcuts (Tab duplicate/reopen, search focus, markdown clip, translate, scroll-to-top, tab mute, copy link).
* Shadow DOM isolation for consistent rendering across complex sites.
* Built-in native autoscroll fallback mechanism.

---

##  Privacy Policy & Disclaimer

* **Privacy First:** QuickWheel operates entirely on your local device. This extension does not transmit, collect, store, or sell any of your personal data or browsing activity.
* **Disclaimer:** Provided "as is" without warranty of any kind. The developer is not liable for any issues that might be caused.
