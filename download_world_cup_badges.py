#!/usr/bin/env python3
"""
One-time script: download 2026 World Cup national team crests (SVG) from FCLOGO
into assets/badges/.

Source pack: https://fclogo.top/pack/2026-fifa-world-cup

For each team page linked from the pack, the script reads the asset filename
from the page HTML and downloads the matching SVG from assets.fclogo.top.
"""

from __future__ import annotations

import random
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OUTPUT_DIR = Path(__file__).resolve().parent / "assets" / "badges"

# Country display name -> local filename (lowercase, underscores)
TEAMS: dict[str, str] = {
    "Mexico": "mexico",
    "South Africa": "south_africa",
    "Switzerland": "switzerland",
    "Canada": "canada",
    "Bosnia and Herzegovina": "bosnia_and_herzegovina",
    "Brazil": "brazil",
    "Morocco": "morocco",
    "USA": "usa",
    "Australia": "australia",
    "Paraguay": "paraguay",
    "Germany": "germany",
    "Ivory Coast": "ivory_coast",
    "Ecuador": "ecuador",
    "Netherlands": "netherlands",
    "Japan": "japan",
    "Sweden": "sweden",
    "Belgium": "belgium",
    "Egypt": "egypt",
    "Spain": "spain",
    "Cape Verde": "cape_verde",
    "France": "france",
    "Norway": "norway",
    "Senegal": "senegal",
    "Argentina": "argentina",
    "Austria": "austria",
    "Algeria": "algeria",
    "Colombia": "colombia",
    "Portugal": "portugal",
    "DR Congo": "dr_congo",
    "England": "england",
    "Croatia": "croatia",
    "Ghana": "ghana",
}

# Map our output filename stem to distinctive slug fragments on FCLOGO team pages.
# Used to match pack links like /fmf/team/mexico-national-football-team-v2025.
SLUG_HINTS: dict[str, tuple[str, ...]] = {
    "mexico": ("mexico-national",),
    "south_africa": ("south-africa-national",),
    "switzerland": ("switzerland-national",),
    "canada": ("canada-mens-national", "canada-national"),
    "bosnia_and_herzegovina": ("bosnia-and-herzegovina-national",),
    "brazil": ("brazil-national-football-team-v2019",),  # prefer full-color over mono
    "morocco": ("morocco-national",),
    "usa": ("united-states-mens-national", "united-states-national"),
    "australia": ("australia-mens-national", "australia-national"),
    "paraguay": ("paraguay-national",),
    "germany": ("germany-national",),
    "ivory_coast": ("ivory-coast-national",),
    "ecuador": ("ecuador-national",),
    "netherlands": ("netherlands-national",),
    "japan": ("japan-national-football-team-v",),  # avoid jordan on same federation path
    "sweden": ("sweden-national",),
    "belgium": ("belgium-national",),
    "egypt": ("egypt-national",),
    "spain": ("spain-national",),
    "cape_verde": ("cape-verde-national",),
    "france": ("france-national",),
    "norway": ("norway-national",),
    "senegal": ("senegal-national",),
    "argentina": ("argentina-national",),
    "austria": ("austria-national",),
    "algeria": ("algeria-national",),
    "colombia": ("colombia-national",),
    "portugal": ("portugal-national",),
    "dr_congo": ("dr-congo-national",),
    "england": ("england-national",),
    "croatia": ("croatia-national",),
    "ghana": ("ghana-national",),
}

USER_AGENT = (
    "tc-work-cup-badge-downloader/1.0 "
    "(https://github.com/joaotomaz-tc/tc-work-cup; one-time asset fetch)"
)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT})

TEAM_PATH_RE = re.compile(r'href="(/[a-z0-9]+/team/[^"]+)"')
ASSET_NAME_RE = re.compile(r"assets\.fclogo\.top/(?:png|svg)/([^\"\\]+\.(?:png|svg))")


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


def _sleep() -> None:
    """Pause 1–2 s after each download (polite rate limiting)."""
    time.sleep(random.uniform(1.0, 2.0))


def _fetch_html(url: str) -> str:
    """GET a page and return its HTML text."""
    resp = SESSION.get(url, timeout=60)
    resp.raise_for_status()
    return resp.text


def _download_bytes(url: str) -> bytes:
    """Download raw bytes from a direct asset URL."""
    resp = SESSION.get(url, timeout=60)
    resp.raise_for_status()
    return resp.content


# ---------------------------------------------------------------------------
# FCLOGO parsing
# ---------------------------------------------------------------------------


def _discover_team_paths(pack_html: str) -> dict[str, str]:
    """
    Parse the pack page and return {filename_stem: team_page_path}.
    Each path looks like /fmf/team/mexico-national-football-team-v2025.
    """
    paths = TEAM_PATH_RE.findall(pack_html)
    matched: dict[str, str] = {}

    for path in paths:
        slug = path.rsplit("/", 1)[-1].lower()
        if slug.endswith("-mono"):
            continue

        for stem, hints in SLUG_HINTS.items():
            if stem in matched:
                continue
            if any(hint in slug for hint in hints):
                matched[stem] = path
                break

    return matched


def _extract_svg_filename(logo_html: str) -> str | None:
    """
    Read the PNG/SVG asset name from a team logo page and return the SVG filename.
    Example: Mexico-national-team-v2025.png -> Mexico-national-team-v2025.svg
    """
    names = ASSET_NAME_RE.findall(logo_html)
    if not names:
        return None

    # Prefer explicit .svg mention if present; otherwise derive from .png name.
    for name in names:
        if name.lower().endswith(".svg"):
            return name

    png_name = names[0]
    return re.sub(r"\.png$", ".svg", png_name, flags=re.IGNORECASE)


def _svg_url(filename: str) -> str:
    """Build the direct SVG CDN URL."""
    return f"{ASSETS_BASE}/{filename}"


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def _looks_like_html(content: bytes) -> bool:
    head = content[:512].lstrip().lower()
    return head.startswith(b"<!doctype html") or head.startswith(b"<html")


def _is_valid_svg(content: bytes) -> bool:
    """Ensure the file is a non-empty SVG (not HTML or another format)."""
    if not content or not content.strip():
        return False
    if _looks_like_html(content):
        return False

    text = content.lstrip()
    if text.startswith(b"<?xml"):
        return b"<svg" in text[:4096].lower()
    return text.lower().startswith(b"<svg")


# ---------------------------------------------------------------------------
# Download workflow
# ---------------------------------------------------------------------------


def download_country(country: str, filename: str, team_path: str) -> bool:
    """Download one badge via its FCLOGO team page."""
    dest = OUTPUT_DIR / f"{filename}.svg"
    page_url = f"{BASE_URL}{team_path}"

    print(f"  page: {page_url}")
    logo_html = _fetch_html(page_url)

    svg_name = _extract_svg_filename(logo_html)
    if not svg_name:
        raise RuntimeError("could not find asset filename on logo page")

    url = _svg_url(svg_name)
    print(f"  svg:  {url}")

    content = _download_bytes(url)
    _sleep()

    if not _is_valid_svg(content):
        if dest.exists():
            dest.unlink()
        raise RuntimeError(f"downloaded file is not a valid SVG ({url})")

    dest.write_bytes(content)
    print(f"  saved: {dest.name}")
    return True


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Pack:   {PACK_URL}")
    print(f"Output: {OUTPUT_DIR}\n")

    print("Fetching pack page…")
    pack_html = _fetch_html(PACK_URL)
    team_paths = _discover_team_paths(pack_html)
    print(f"Matched {len(team_paths)} team pages on FCLOGO\n")

    downloaded = 0
    failed: list[str] = []

    for country, filename in TEAMS.items():
        print(f"[{downloaded + len(failed) + 1}/{len(TEAMS)}] {country}")
        team_path = team_paths.get(filename)
        if not team_path:
            print(f"  FAILED: no FCLOGO link found for {filename}")
            failed.append(country)
            continue

        try:
            if download_country(country, filename, team_path):
                downloaded += 1
        except Exception as exc:  # noqa: BLE001 — continue on failure
            print(f"  FAILED: {country}")
            print(f"  {type(exc).__name__}: {exc}")
            failed.append(country)

    print()
    print(f"Downloaded: {downloaded}/{len(TEAMS)}")
    if failed:
        print("Failed:")
        for name in failed:
            print(f"- {name}")
    else:
        print("Failed: (none)")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
