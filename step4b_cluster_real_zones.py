"""
STEP 4B — Cluster confirmed real-danger events by location (DBSCAN).

min_samples=2 (not 3+) because real manual-shake test data comes from only
a handful of phones -- two different cars confirming the same spot should
still count as a genuine zone for demo purposes.
"""

import pandas as pd
from sklearn.cluster import DBSCAN

INPUT_CSV = "step2b_real_labeled_events.csv"
OUTPUT_CSV = "step4b_real_danger_zones.csv"

EPS_DEGREES = 0.0005  # roughly ~50m; shrink/grow to match how far apart your test phones stood
MIN_SAMPLES = 2


def cluster_zones():
    df = pd.read_csv(INPUT_CSV)
    real_events = df[df["is_real_danger"] == True].copy()

    if real_events.empty:
        raise SystemExit(
            "No real-danger events to cluster. Lower the quantile_cutoff in "
            "step2b, or collect more test shakes."
        )

    coords = real_events[["lat", "lon"]].to_numpy()
    labels = DBSCAN(eps=EPS_DEGREES, min_samples=MIN_SAMPLES).fit_predict(coords)
    real_events["cluster_id"] = labels

    zones = real_events[real_events["cluster_id"] != -1].copy()

    if zones.empty:
        print(
            "No clusters formed (all events treated as noise). Try increasing "
            "EPS_DEGREES, lowering MIN_SAMPLES to consider, or making sure "
            "test phones shook at the SAME physical spot."
        )
    else:
        summary = zones.groupby("cluster_id").agg(
            events=("cluster_id", "count"),
            cars_involved=("car_id", "nunique"),
            avg_lat=("lat", "mean"),
            avg_lon=("lon", "mean"),
        )
        print(f"Found {zones['cluster_id'].nunique()} danger zone(s)")
        print(summary)

    zones.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved -> {OUTPUT_CSV}")
    return zones


if __name__ == "__main__":
    cluster_zones()
