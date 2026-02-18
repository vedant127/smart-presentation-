"""
migrate_library.py
==================
One-time script to copy real PPTX files from the Downloads source
into the backend Library folder with the correct naming convention.

Source:  C:\\Users\\Admin\\Downloads\\Feasability study-20260204T052546Z-3-001 (1)\\Feasability study\\
Target:  <backend>\\Library\\Feasibility Study\\

Naming:  Source files use underscores: dubai_residential_apartments_luxury.pptx
         Engine expects spaces+plus:   dubai + residential + apartments + luxury.pptx
"""

import os
import shutil
import re

# ── Paths ──────────────────────────────────────────────────────────────────────
SOURCE_ROOT = r"C:\Users\Admin\Downloads\Feasability study-20260204T052546Z-3-001 (1)\Feasability study"
BACKEND_ROOT = os.path.dirname(os.path.abspath(__file__))
LIBRARY_ROOT = os.path.join(BACKEND_ROOT, "Library", "Feasibility Study")

# ── Folder mapping: Source folder name → Library folder name ──────────────────
# Format: "source folder name" -> "Library/Feasibility Study/<target>"
FOLDER_MAP = {
    "cover page 1":                          "01_Cover Page",
    "table of content 2":                    "02_Table of Contents",
    "project background 3":                  "03_Project Background",
    "executive summary 4":                   "04_Executive Summary",
    "site assesment 5":                      "05_Site Assessment",
    "market overview 6":                     "06_Market Overview",
    "development recommendations PART 1 7":  "07_Development Recommendations Part 1",
    "development recommendations PART 2 8":  "08_Development Recommendations Part 2",
    "development recommendations PART 3 9":  "09_Development Recommendations Part 3",
    "financial and investment analysis 10":  "10_Financial & Investment Analysis",
    "disclaimer 11":                         "11_Disclaimer",
}

# ── Fixed section filename mapping: source filename → target filename ──────────
# For non-varying sections, we rename to a clean standard name
FIXED_FILE_MAP = {
    "cover page.pptx":        "cover.pptx",
    "table of content.pptx":  "toc.pptx",
    "project background.pptx": "project_background.pptx",
    "site assesment.pptx":    "site_assessment.pptx",
    "executive summary.pptx": "executive_summary.pptx",
    "disclaimer.pptx":        "disclaimer.pptx",
}


def underscore_to_plus(filename):
    """
    Convert underscore-separated filename to plus-separated.
    e.g. dubai_residential_apartments_luxury.pptx
      -> dubai + residential + apartments + luxury.pptx
    """
    name, ext = os.path.splitext(filename)
    parts = name.split("_")
    return " + ".join(parts) + ext


def copy_folder(src_folder, dst_folder, is_varying=True):
    """Copy all PPTX files from src_folder to dst_folder with renaming."""
    os.makedirs(dst_folder, exist_ok=True)
    
    if not os.path.isdir(src_folder):
        print(f"  ⚠️  Source folder not found: {src_folder}")
        return 0

    files = [f for f in os.listdir(src_folder) if f.lower().endswith(".pptx") and not f.startswith("~$")]
    copied = 0

    for fname in files:
        src_path = os.path.join(src_folder, fname)
        
        if is_varying:
            # Rename: underscores → " + "
            new_name = underscore_to_plus(fname)
        else:
            # Fixed sections: use clean standard name if mapped, else keep original
            new_name = FIXED_FILE_MAP.get(fname.lower(), fname)

        dst_path = os.path.join(dst_folder, new_name)
        
        if os.path.exists(dst_path):
            print(f"  ⏭️  Already exists, skipping: {new_name}")
            copied += 1
            continue

        shutil.copy2(src_path, dst_path)
        size_mb = round(os.path.getsize(dst_path) / 1024 / 1024, 2)
        print(f"  ✅ {fname}")
        print(f"      → {new_name} ({size_mb} MB)")
        copied += 1

    return copied


def main():
    print("=" * 65)
    print("  LIBRARY MIGRATION SCRIPT")
    print(f"  Source: {SOURCE_ROOT}")
    print(f"  Target: {LIBRARY_ROOT}")
    print("=" * 65)

    if not os.path.isdir(SOURCE_ROOT):
        print(f"\n❌ ERROR: Source folder not found:\n   {SOURCE_ROOT}")
        print("\nPlease check that the Downloads folder path is correct.")
        return

    total_copied = 0

    # Non-varying sections (fixed files, no criteria-based naming)
    NON_VARYING = {
        "cover page 1",
        "table of content 2",
        "project background 3",
        "executive summary 4",
        "site assesment 5",
        "disclaimer 11",
    }

    for src_name, dst_name in FOLDER_MAP.items():
        src_folder = os.path.join(SOURCE_ROOT, src_name)
        dst_folder = os.path.join(LIBRARY_ROOT, dst_name)
        is_varying = src_name not in NON_VARYING

        print(f"\n📁 [{dst_name}]")
        print(f"   Source: {src_name}")
        print(f"   Varying: {is_varying}")

        n = copy_folder(src_folder, dst_folder, is_varying=is_varying)
        total_copied += n
        print(f"   → {n} file(s) processed")

    print("\n" + "=" * 65)
    print(f"  ✅ MIGRATION COMPLETE — {total_copied} files processed")
    print("=" * 65)

    # Verify result
    print("\n📊 Library contents after migration:")
    for root, dirs, files in os.walk(LIBRARY_ROOT):
        level = root.replace(LIBRARY_ROOT, "").count(os.sep)
        indent = "  " * level
        folder_name = os.path.basename(root)
        pptx_files = [f for f in files if f.lower().endswith(".pptx")]
        print(f"{indent}📁 {folder_name}/ ({len(pptx_files)} PPTX files)")
        if level == 1:  # Only show files one level deep to avoid clutter
            for f in pptx_files[:3]:
                print(f"{indent}  📄 {f}")
            if len(pptx_files) > 3:
                print(f"{indent}  ... and {len(pptx_files)-3} more")


if __name__ == "__main__":
    main()
