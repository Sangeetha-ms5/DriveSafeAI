"""
RUN ALL OF PIPELINE B IN ONE GO.

Usage:
    python run_pipeline_b.py

Requires serviceAccountKey.json in this folder first.
"""

from step1b_pull_firebase_data import pull_events
from step2b_apply_threshold_rule import apply_threshold
from step4b_cluster_real_zones import cluster_zones
from step6b_dashboard_real import build_dashboard

if __name__ == "__main__":
    print("=== STEP 1B: Pull Firebase data ===")
    pull_events()

    print("\n=== STEP 2B: Apply threshold rule ===")
    apply_threshold()

    print("\n=== STEP 4B: Cluster real danger zones ===")
    cluster_zones()

    print("\n=== STEP 6B: Build dashboard ===")
    build_dashboard()

    print("\nDone. Open dashboard_real.html in a browser to view the map.")
