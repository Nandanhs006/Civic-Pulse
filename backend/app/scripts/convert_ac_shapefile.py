"""One-off: convert the DataMeet India assembly-constituency shapefile into a
bundled GeoJSON of Karnataka ACs (with parent PC linkage) for GPS routing.

Downloads India_AC.{shp,dbf,shx}, filters ST_NAME == "Karnataka", and writes
app/scripts/data/karnataka_ac.geojson with props: ac_no, ac_name, pc_name, st_name.

Dev/data-prep only (needs `pyshp`); the running app just reads the GeoJSON.
Run:  python -m app.scripts.convert_ac_shapefile
"""
import json
import os
import tempfile

import httpx
import shapefile  # pyshp

BASE = "https://raw.githubusercontent.com/datameet/maps/master/assembly-constituencies"
PARTS = ["India_AC.shp", "India_AC.dbf", "India_AC.shx"]
STATE = "KARNATAKA"  # shapefile stores state names uppercase
OUT = os.path.join(os.path.dirname(__file__), "data", "karnataka_ac.geojson")
USER_AGENT = "CivicPulse-AC-Convert/1.0 (educational hackathon project)"


def download(tmpdir: str) -> str:
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=120) as client:
        for part in PARTS:
            dest = os.path.join(tmpdir, part)
            print(f"[dl] {part} ...")
            with client.stream("GET", f"{BASE}/{part}") as r:
                r.raise_for_status()
                with open(dest, "wb") as f:
                    for chunk in r.iter_bytes():
                        f.write(chunk)
    return os.path.join(tmpdir, "India_AC")


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        base = download(tmp)
        reader = shapefile.Reader(base, encoding="latin-1")
        fields = [f[0] for f in reader.fields[1:]]  # skip deletion flag
        features = []
        for sr in reader.iterShapeRecords():
            rec = dict(zip(fields, sr.record))
            if str(rec.get("ST_NAME", "")).strip() != STATE:
                continue
            features.append(
                {
                    "type": "Feature",
                    "geometry": sr.shape.__geo_interface__,
                    "properties": {
                        "ac_no": rec.get("AC_NO"),
                        "ac_name": str(rec.get("AC_NAME", "")).strip(),
                        "pc_name": str(rec.get("PC_NAME", "")).strip(),
                        "dist_name": str(rec.get("DIST_NAME", "")).strip(),
                        "st_name": str(rec.get("ST_NAME", "")).strip(),
                    },
                }
            )
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)
    size = os.path.getsize(OUT)
    print(f"[done] wrote {len(features)} Karnataka ACs -> {OUT} ({size} bytes)")
    print("[sample]", [x["properties"] for x in features[:3]])


if __name__ == "__main__":
    main()
