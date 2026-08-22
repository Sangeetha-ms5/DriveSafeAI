"""
LIVE MODE — reruns the whole pipeline every few seconds so the dashboard
keeps updating on its own as new phone-shake events come into Firebase.
No need to manually re-run anything once this is started.

Usage:
    python watch_pipeline_b.py

Leave this running in a terminal during your live demo. Open
dashboard_real.html in a browser once -- it will auto-refresh itself
(every 10 seconds) and pick up new data each time this script updates it.

Press Ctrl+C to stop.
"""

import time

from step1b_pull_firebase_data import pull_events
from step2b_apply_threshold_rule import apply_threshold
from step4b_cluster_real_zones import cluster_zones
from step6b_dashboard_real import build_dashboard

REFRESH_SECONDS = 20


def run_once():
    try:
        pull_events()
        apply_threshold()
        cluster_zones()
        build_dashboard()
    except SystemExit as e:
        # expected when there's no data yet -- just skip this cycle
        print(f"(skipped this cycle: {e})")


if __name__ == "__main__":
    print(f"Live mode started. Refreshing every {REFRESH_SECONDS}s. Ctrl+C to stop.")
    while True:
        print("\n--- refreshing ---")
        run_once()
        time.sleep(REFRESH_SECONDS)